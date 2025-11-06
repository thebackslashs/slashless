use super::banner::BANNER;
use super::state::ConsoleState;
use crate::config::ConsoleMode;
use ratatui::{
    layout::{Alignment, Constraint, Layout, Rect},
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::Paragraph,
    Frame,
};

pub fn render_console(f: &mut Frame, state: &ConsoleState, mode: &ConsoleMode) {
    let area = f.size();

    // Calculate banner height
    let banner_height = 17;

    // In standard mode (rich TUI), don't show logs section
    let vertical = match mode {
        ConsoleMode::Standard => Layout::vertical([
            Constraint::Length(banner_height),
            Constraint::Length(1),
            Constraint::Length(3),
            Constraint::Length(4),
        ])
        .split(area),
        ConsoleMode::Boring => {
            // This shouldn't be called in boring mode, but just in case
            Layout::vertical([
                Constraint::Length(banner_height),
                Constraint::Length(1),
                Constraint::Length(3),
                Constraint::Length(4),
            ])
            .split(area)
        }
    };

    // Render banner
    render_banner(f, vertical[0], &state.version);

    // Status section (now with 3 lines: Server, Redis, Security)
    let status_area = vertical[2];
    let status_layout = Layout::vertical([
        Constraint::Length(1),
        Constraint::Length(1),
        Constraint::Length(1),
    ])
    .split(status_area);

    // Server status
    let server_label = "Server Status     ";
    let server_value = state.server_status.text();
    let server_line = Line::from(vec![
        Span::styled(server_label, Style::default()),
        Span::styled(server_value, state.server_status.style()),
    ]);
    let server_para = Paragraph::new(server_line).alignment(Alignment::Left);
    let server_area = Rect {
        x: status_layout[0].x + 2,
        y: status_layout[0].y,
        width: status_layout[0].width.saturating_sub(2),
        height: status_layout[0].height,
    };
    f.render_widget(server_para, server_area);

    // Redis status
    let redis_label = "Redis Status      ";
    let redis_value = state.redis_status.text();
    let redis_line = Line::from(vec![
        Span::styled(redis_label, Style::default()),
        Span::styled(redis_value, state.redis_status.style()),
    ]);
    let redis_para = Paragraph::new(redis_line).alignment(Alignment::Left);
    let redis_area = Rect {
        x: status_layout[1].x + 2,
        y: status_layout[1].y,
        width: status_layout[1].width.saturating_sub(2),
        height: status_layout[1].height,
    };
    f.render_widget(redis_para, redis_area);

    // Security status
    let security_label = "Security Status   ";
    let (security_value, security_style) = if state.is_secure {
        (
            "SECURE",
            Style::default()
                .fg(Color::Green)
                .add_modifier(Modifier::BOLD),
        )
    } else {
        (
            "UNSAFE",
            Style::default().fg(Color::Red).add_modifier(Modifier::BOLD),
        )
    };
    let security_line = Line::from(vec![
        Span::styled(security_label, Style::default()),
        Span::styled(security_value, security_style),
    ]);
    let security_para = Paragraph::new(security_line).alignment(Alignment::Left);
    let security_area = Rect {
        x: status_layout[2].x + 2,
        y: status_layout[2].y,
        width: status_layout[2].width.saturating_sub(2),
        height: status_layout[2].height,
    };
    f.render_widget(security_para, security_area);

    // Config section
    let config_area = vertical[3];
    let config_layout = Layout::vertical([
        Constraint::Length(1),
        Constraint::Length(1),
        Constraint::Length(1),
        Constraint::Length(1),
    ])
    .split(config_area);

    // Server config
    let server_config_label = "Listen Address    ";
    let server_config_line = Line::from(vec![
        Span::styled(server_config_label, Style::default().fg(Color::Gray)),
        Span::styled(
            state.server_address.clone(),
            Style::default().fg(Color::DarkGray),
        ),
    ]);
    let server_config = Paragraph::new(server_config_line).alignment(Alignment::Left);
    let server_config_area = Rect {
        x: config_layout[0].x + 2,
        y: config_layout[0].y,
        width: config_layout[0].width.saturating_sub(2),
        height: config_layout[0].height,
    };
    f.render_widget(server_config, server_config_area);

    // Redis config
    let redis_config_label = "Redis Endpoint    ";
    let redis_config_line = Line::from(vec![
        Span::styled(redis_config_label, Style::default().fg(Color::Gray)),
        Span::styled(
            state.redis_address.clone(),
            Style::default().fg(Color::DarkGray),
        ),
    ]);
    let redis_config = Paragraph::new(redis_config_line).alignment(Alignment::Left);
    let redis_config_area = Rect {
        x: config_layout[1].x + 2,
        y: config_layout[1].y,
        width: config_layout[1].width.saturating_sub(2),
        height: config_layout[1].height,
    };
    f.render_widget(redis_config, redis_config_area);

    // Connections config
    let connections_config_label = "Pool Size         ";
    let connections_config_line = Line::from(vec![
        Span::styled(connections_config_label, Style::default().fg(Color::Gray)),
        Span::styled(
            state.connections.to_string(),
            Style::default().fg(Color::DarkGray),
        ),
    ]);
    let connections_config = Paragraph::new(connections_config_line).alignment(Alignment::Left);
    let connections_config_area = Rect {
        x: config_layout[2].x + 2,
        y: config_layout[2].y,
        width: config_layout[2].width.saturating_sub(2),
        height: config_layout[2].height,
    };
    f.render_widget(connections_config, connections_config_area);

    // Max retry config
    let max_retry_display = if state.max_retry == -1 {
        "unlimited".to_string()
    } else {
        state.max_retry.to_string()
    };
    let max_retry_config_label = "Max Retries       ";
    let max_retry_config_line = Line::from(vec![
        Span::styled(max_retry_config_label, Style::default().fg(Color::Gray)),
        Span::styled(max_retry_display, Style::default().fg(Color::DarkGray)),
    ]);
    let max_retry_config = Paragraph::new(max_retry_config_line).alignment(Alignment::Left);
    let max_retry_config_area = Rect {
        x: config_layout[3].x + 2,
        y: config_layout[3].y,
        width: config_layout[3].width.saturating_sub(2),
        height: config_layout[3].height,
    };
    f.render_widget(max_retry_config, max_retry_config_area);
}

pub fn render_banner(f: &mut Frame, area: Rect, version: &str) {
    let lines: Vec<&str> = BANNER.lines().collect();
    let mut displayed_lines = Vec::new();

    for line in lines.iter() {
        if !line.trim().is_empty() {
            displayed_lines.push(*line);
        }
    }

    let banner_layout = Layout::vertical([
        Constraint::Length(3),
        Constraint::Length(displayed_lines.len() as u16),
        Constraint::Length(1),
        Constraint::Length(1),
    ])
    .split(area);

    // Render banner ASCII art
    for (i, line) in displayed_lines.iter().enumerate() {
        if i < banner_layout[1].height as usize {
            let para = Paragraph::new(*line).style(
                Style::default()
                    .fg(Color::Cyan)
                    .add_modifier(Modifier::BOLD),
            );
            let line_area = Rect {
                x: banner_layout[1].x,
                y: banner_layout[1].y + i as u16,
                width: banner_layout[1].width,
                height: 1,
            };
            f.render_widget(para, line_area);
        }
    }

    // Render version
    let version_text = format!("  v{}", version);
    let version_para = Paragraph::new(version_text).style(Style::default().fg(Color::DarkGray));
    f.render_widget(version_para, banner_layout[3]);
}
