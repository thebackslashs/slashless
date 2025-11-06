use crate::config::ConsoleMode;
use crossterm::{
    event::{self, Event, KeyCode, KeyEventKind, KeyModifiers},
    execute,
    terminal::{disable_raw_mode, enable_raw_mode},
};
use ratatui::{backend::CrosstermBackend, Terminal};
use std::io::{self, stdout, Write};
use tokio::sync::mpsc;

use super::render::render_console;
use super::state::{ConsoleCommand, ConsoleState};
use super::status::Status;

#[derive(Clone)]
pub struct Console {
    sender: Option<mpsc::UnboundedSender<ConsoleCommand>>,
    mode: ConsoleMode,
}

impl Console {
    pub fn new(
        server_address: String,
        redis_address: String,
        connections: usize,
        max_retry: i32,
        version: String,
        mode: ConsoleMode,
    ) -> io::Result<(Self, Option<mpsc::UnboundedReceiver<()>>)> {
        match mode {
            ConsoleMode::Rich => {
                // Clear screen first
                print!("\x1B[2J\x1B[1;1H");
                io::stdout().flush().unwrap();

                // Enable raw mode
                enable_raw_mode()?;

                // Create channel for commands
                let (sender, mut receiver) = mpsc::unbounded_channel();

                // Create channel for shutdown signal (from keyboard input)
                let (shutdown_sender, shutdown_receiver) = mpsc::unbounded_channel();
                let shutdown_sender_for_thread = shutdown_sender.clone();

                // Create initial state
                let mut state = ConsoleState::new(
                    server_address,
                    redis_address,
                    connections,
                    max_retry,
                    version,
                );

                // Initialize terminal in a blocking task
                let stdout = stdout();
                let backend = CrosstermBackend::new(stdout);
                let mut terminal = Terminal::new(backend)?;

                // Spawn rendering task that runs in a blocking thread
                tokio::task::spawn_blocking(move || {
                    loop {
                        // Check for keyboard input (non-blocking)
                        if event::poll(std::time::Duration::from_millis(10)).unwrap_or(false) {
                            if let Ok(Event::Key(key_event)) = event::read() {
                                // Check for Ctrl+C
                                if key_event.kind == KeyEventKind::Press {
                                    match key_event.code {
                                        KeyCode::Char('c')
                                            if key_event
                                                .modifiers
                                                .contains(KeyModifiers::CONTROL) =>
                                        {
                                            // Ctrl+C detected - send shutdown signal
                                            let _ = shutdown_sender_for_thread.send(());
                                            break;
                                        }
                                        KeyCode::Char('C')
                                            if key_event
                                                .modifiers
                                                .contains(KeyModifiers::CONTROL) =>
                                        {
                                            // Ctrl+C detected (uppercase)
                                            let _ = shutdown_sender_for_thread.send(());
                                            break;
                                        }
                                        _ => {}
                                    }
                                }
                            }
                        }

                        // Try to receive all pending commands
                        let mut should_render = false;

                        // Process all available commands
                        while let Ok(cmd) = receiver.try_recv() {
                            match cmd {
                                ConsoleCommand::UpdateServerStatus(status) => {
                                    state.server_status = status;
                                    should_render = true;
                                }
                                ConsoleCommand::UpdateRedisStatus(status) => {
                                    state.redis_status = status;
                                    should_render = true;
                                }
                            }
                        }

                        // Render if we have updates
                        if should_render {
                            if let Err(e) = terminal.draw(|f| {
                                render_console(f, &state, &ConsoleMode::Rich);
                            }) {
                                tracing::error!("Failed to render console: {}", e);
                                break;
                            }
                        }

                        // Small sleep to avoid busy-waiting
                        std::thread::sleep(std::time::Duration::from_millis(50));
                    }
                });

                Ok((
                    Self {
                        sender: Some(sender),
                        mode,
                    },
                    Some(shutdown_receiver),
                ))
            }
            ConsoleMode::Standard => {
                // Standard mode: no console UI, just log to tracing
                tracing::info!("Starting server in standard mode");
                tracing::info!("Server: {}", server_address);
                tracing::info!("Redis: {}", redis_address);
                tracing::info!("Max connections: {}", connections);
                let retry_display = if max_retry == -1 {
                    "unlimited".to_string()
                } else {
                    max_retry.to_string()
                };
                tracing::info!("Max retry: {}", retry_display);
                tracing::info!("Version: {}", version);

                Ok((Self { sender: None, mode }, None))
            }
        }
    }

    pub fn update_server_status(&self, status: Status) -> io::Result<()> {
        match &self.mode {
            ConsoleMode::Rich => {
                if let Some(ref sender) = self.sender {
                    sender
                        .send(ConsoleCommand::UpdateServerStatus(status))
                        .map_err(|e| {
                            io::Error::other(format!("Failed to send command: {}", e))
                        })?;
                }
            }
            ConsoleMode::Standard => {
                tracing::info!("Server status: {}", status.text());
            }
        }
        Ok(())
    }

    pub fn update_redis_status(&self, status: Status) -> io::Result<()> {
        match &self.mode {
            ConsoleMode::Rich => {
                if let Some(ref sender) = self.sender {
                    sender
                        .send(ConsoleCommand::UpdateRedisStatus(status))
                        .map_err(|e| {
                            io::Error::other(format!("Failed to send command: {}", e))
                        })?;
                }
            }
            ConsoleMode::Standard => {
                tracing::info!("Redis status: {}", status.text());
            }
        }
        Ok(())
    }

    pub fn log_info(&self, message: String) -> io::Result<()> {
        match &self.mode {
            ConsoleMode::Rich => {
                // In rich mode, logs are ignored (not displayed)
            }
            ConsoleMode::Standard => {
                tracing::info!("{}", message);
            }
        }
        Ok(())
    }

    pub fn log_error(&self, message: String) -> io::Result<()> {
        match &self.mode {
            ConsoleMode::Rich => {
                // In rich mode, logs are ignored (not displayed)
            }
            ConsoleMode::Standard => {
                tracing::error!("{}", message);
            }
        }
        Ok(())
    }

    pub fn log_warn(&self, message: String) -> io::Result<()> {
        match &self.mode {
            ConsoleMode::Rich => {
                // In rich mode, logs are ignored (not displayed)
            }
            ConsoleMode::Standard => {
                tracing::warn!("{}", message);
            }
        }
        Ok(())
    }

    #[allow(dead_code)]
    pub fn log_debug(&self, message: String) -> io::Result<()> {
        match &self.mode {
            ConsoleMode::Rich => {
                // In rich mode, logs are ignored (not displayed)
            }
            ConsoleMode::Standard => {
                tracing::debug!("{}", message);
            }
        }
        Ok(())
    }

    #[allow(dead_code)]
    pub fn mode(&self) -> &ConsoleMode {
        &self.mode
    }

    pub fn cleanup(&self) -> io::Result<()> {
        match &self.mode {
            ConsoleMode::Rich => {
                // Restore terminal state - this must happen immediately
                // First disable raw mode to restore normal terminal behavior
                // This will stop ^C from being displayed
                if let Err(e) = disable_raw_mode() {
                    // If disable_raw_mode fails, try to continue anyway
                    eprintln!("Warning: Failed to disable raw mode: {}", e);
                }

                // Then show cursor and restore terminal
                if let Err(e) = execute!(io::stdout(), crossterm::cursor::Show,) {
                    eprintln!("Warning: Failed to show cursor: {}", e);
                }

                // Clear any pending input that might show ^C
                // Note: In raw mode, stdin might not be readable, so we just flush
                // The important thing is that raw mode is disabled first

                // Flush stdout to ensure all output is written
                let _ = io::stdout().flush();

                // Clear the screen and move cursor to top-left
                print!("\x1B[2J\x1B[1;1H");
                let _ = io::stdout().flush();
            }
            ConsoleMode::Standard => {
                // Nothing to clean up in standard mode
            }
        }
        Ok(())
    }
}

impl Drop for Console {
    fn drop(&mut self) {
        let _ = self.cleanup();
    }
}
