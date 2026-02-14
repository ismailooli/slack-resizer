# slack-resizer

i got tired of having to resize my emojis manually on some sketchy websites so i made this. 

## Features

-   **100% Client-Side**: All processing happens in your browser. No images are uploaded to any server, ensuring complete privacy.
-   **GIF Trimming**: Upload a GIF and select exactly the start and end frames you want to keep.
-   **Smart Cropping**: Zoom, pan, and crop your images or GIF frames to focus on the action.
-   **Slack Optimization**: Automatically resizes output to meet Slack's file size and dimension recommndations.
-   **Instant Preview**: See exactly what your emoji will look like before you save it.
-   **Clean UI**: Built with a modern, distraction-free interface.

## Tech Stack

-   **Frontend Framework**: [React](https://react.dev/) + [Vite](https://vitejs.dev/)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **Fonts**: Plus Jakarta Sans & Syne (via Google Fonts)
-   **Core Libraries**:
    -   `react-easy-crop`: For intuitive image cropping.
    -   `gif.js` & `gifuct-js`: For parsing and generating GIFs in the browser.

## Getting Started

Follow these steps to run the project locally.

### Prerequisites

-   Node.js (v18+ recommended)
-   npm or yarn

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/yourusername/slack-resizer.git
    cd slack-resizer
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Start the development server:
    ```bash
    npm run dev
    ```

4.  Open your browser and navigate to `http://localhost:5173`.


## License

MIT
