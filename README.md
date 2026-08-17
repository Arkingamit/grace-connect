# Grace Connect Multi Campus App  https://grace-church.netlify.app/

A modern responsive web application designed for the Grace Ahmedabad church community. It provides access to worship music, sermons, events, prayer wall, gallery, and more, helping members stay connected and engaged.

## What Problem Does This App Solve?

Church communities often span multiple campuses and have diverse groups (such as youth, women, prayer, and events) with unique needs. Traditional communication and event management can be fragmented, leading to missed information, privacy concerns, and lack of engagement. This app centralizes all church activities, ensures privacy, and delivers targeted content to the right members, solving these challenges.

## Multi-Campus & Group-Based Functionality

- **Campus Management**: Supports multiple campuses, each representing a physical church location or community.
- **Group Organization**: Each campus contains various groups (Events, Prayer Meetings, Women’s Meetings, Youth Groups, etc.).
- **Member Assignment**: Members can belong to different campuses and participate in multiple groups based on their interests or eligibility.
- **Group-Specific Content & Privacy**:
  - Events, registration forms, event photos, and sermon photos are visible only to members of the relevant group and campus.
  - For example, a Women’s event is only visible to the Women’s group members of that campus; Youth events are restricted to youth group members.
  - No other member outside the group/campus can access this content, ensuring privacy and relevance.
- **Targeted Communication**: Notifications and messages about events or meetings are sent only to the appropriate group members within each campus.
- **Personalized Experience**: Every member sees only the content, events, and media relevant to their groups and campus, increasing engagement and connection.

## Features

- **Worship Music Carousel**: Browse and play worship songs with fullscreen YouTube video support.
- **Sermons**: Access recent and archived sermons.
- **Events**: Stay updated with upcoming church events.
- **Prayer Wall**: Share and view prayer requests.
- **Gallery**: View photos and highlights from church activities.
- **Groups**: Connect with church groups and ministries.
- **Live Stream**: Watch live church services.
- **Responsive Navigation**: Desktop and mobile-friendly navigation.
- **Modern UI**: Built with React, Tailwind CSS, and elegant UI components.

## Tech Stack

- **Frontend**: React, TypeScript, Vite
- **Styling**: Tailwind CSS, PostCSS
- **State Management**: React Query
- **Routing**: React Router
- **UI Components**: Custom and third-party components
- **Swiper.js**: For music carousel

## Getting Started

### Prerequisites

- Node.js (v16 or higher recommended)
- npm or bun

### Installation

1. Clone the repository:
   ```sh
   git clone <your-repo-url>
   cd Grace
   ```
2. Install dependencies:
   ```sh
   npm install
   # or
   bun install
   ```
3. Start the development server:
   ```sh
   npm run dev
   # or
   bun run dev
   ```
4. Open [http://localhost:5173](http://localhost:5173) in your browser.

## Project Structure

```
Grace/
├── public/            # Static assets
├── src/
│   ├── assets/        # Images, icons, etc.
│   ├── components/
│   │   └── ui/        # UI components (accordion, navigation, song-carousel, etc.)
│   ├── hooks/         # Custom React hooks
│   ├── lib/           # Utility functions
│   ├── pages/         # Page components (Index, Sermons, Groups, Music, NotFound)
│   ├── App.tsx        # Main app component
│   └── main.tsx       # App entry point
├── index.html         # HTML template
├── package.json       # Project metadata and scripts
├── tailwind.config.ts # Tailwind CSS configuration
├── vite.config.ts     # Vite configuration
└── ...                # Other config files
```

## Scripts

- `dev`: Start development server
- `build`: Build for production
- `preview`: Preview production build

## Contributing

Contributions are welcome! Please open issues or submit pull requests for improvements, bug fixes, or new features.

## License

This project is licensed under the MIT License.

## Contact

For questions or support, contact the Grace Ahmedabad church team.

---

_Where hearts unite – Grace Ahmedabad_


