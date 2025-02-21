# Video Processing API

A REST API service for video file management with features like upload, trim, merge, and share.

## Features

- Video upload with size and duration constraints
- Video trimming
- Video merging
- Time-based share links
- Authentication using JWT
- SQLite database
- Comprehensive test coverage

## Prerequisites

- Node.js (v14 or higher)
- FFmpeg installed on your system
- SQLite3

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/video-api.git
cd video-api
```

2. Install dependencies:
```bash
npm install
```

3. Create uploads directory:
```bash
mkdir uploads
```

## Running the Application

Start the development server:
```bash
npm run dev
```

The API will be available at `http://localhost:3000`

## Running Tests

Run unit tests:
```bash
npm test
```

Run e2e tests:
```bash
npm run test:e2e
```

View test coverage:
```bash
npm test -- --coverage
```

## API Documentation

API documentation is available at `/api-docs` when the server is running.

## Demo Video

[Link to demo video will be added here]

## Technical Choices

1. **FFmpeg**: Chosen for video processing due to its robust features and wide format support
2. **SQLite**: Selected for its simplicity and zero-configuration nature
3. **JWT**: Used for authentication due to its stateless nature and industry standard acceptance

## References

1. [FFmpeg Documentation](https://ffmpeg.org/documentation.html)
2. [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
3. [REST API Design Best Practices](https://stackoverflow.blog/2020/03/02/best-practices-for-rest-api-design/)