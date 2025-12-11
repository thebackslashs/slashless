use ratatui::style::{Color, Modifier, Style};

pub enum Status {
    Connected,
    Ready,
    Starting,
    Establishing,
    #[allow(dead_code)]
    Disconnected,
    Reconnecting,
    BindError,
    ConnectionError,
}

impl Status {
    pub fn text(&self) -> &'static str {
        match self {
            Status::Connected => "CONNECTED",
            Status::Ready => "READY",
            Status::Starting => "STARTING",
            Status::Establishing => "ESTABLISHING CONNECTION",
            Status::Disconnected => "DISCONNECTED",
            Status::Reconnecting => "RECONNECTING",
            Status::BindError => "BIND ERROR",
            Status::ConnectionError => "CONNECTION ERROR",
        }
    }

    pub fn color(&self) -> Color {
        match self {
            Status::Connected => Color::Green,
            Status::Ready => Color::Green,
            Status::Starting => Color::Gray,
            Status::Establishing => Color::DarkGray,
            Status::Disconnected => Color::Yellow,
            Status::Reconnecting => Color::Gray,
            Status::BindError => Color::Red,
            Status::ConnectionError => Color::Red,
        }
    }

    pub fn style(&self) -> Style {
        Style::default().fg(self.color()).add_modifier(
            if matches!(
                self,
                Status::Connected
                    | Status::Ready
                    | Status::Disconnected
                    | Status::BindError
                    | Status::ConnectionError
            ) {
                Modifier::BOLD
            } else {
                Modifier::empty()
            },
        )
    }
}
