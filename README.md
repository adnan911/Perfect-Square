# Draw the Perfect Square

A casual, skill-based web game where players attempt to draw a perfect square using mouse or touch input. The system analyzes the drawing using geometry-based algorithms to score closure, angles, side equality, and straightness.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)

## 🎮 Features

- **Geometry Analysis**: Algorithms to evaluate corner detection, side equality, and straightness.
- **Scoring System**: Real-time evaluation of your drawing skills.
- **Leaderboard**: Track high scores globally.
- **Responsive Design**: Works on both desktop (mouse) and mobile (touch).
- **Celebratory Effects**: Visual feedback using `canvas-confetti`.

## 🛠 Tech Stack

### Frontend
- **Framework**: React with Vite
- **Styling**: Tailwind CSS & Shadcn/ui (Radix Primitives)
- **State Management**: TanStack React Query
- **Routing**: Wouter
- **Animations**: Framer Motion

### Backend
- **Runtime**: Node.js with Express
- **Database**: PostgreSQL with Drizzle ORM
- **Validation**: Zod (Shared schemas between client/server)

## 🚀 Getting Started

### Prerequisites
- Node.js (v20+ recommended)
- PostgreSQL database

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/adnan911/Perfect-Square.git
   cd Perfect-Square
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory and add your database connection string:
   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/perfect_square
   ```

4. **Database Migration**
   Push the schema to your database:
   ```bash
   npm run db:push
   ```

5. **Run the Development Server**
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:5000`.

## 📂 Project Structure

- `client/`: React frontend code
- `server/`: Express backend code
- `shared/`: Types and schemas shared between client and server
- `migrations/`: Drizzle SQL migrations

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.
