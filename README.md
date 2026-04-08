# 🇸🇪 SvenskDaglig

An AI-powered Swedish language learning app for intermediate learners. Paste any Swedish text to get instant sentence-by-sentence analysis, or practice conversational Swedish with an AI tutor.

## Features

**Text Analyzer**
- Paste any Swedish text — news articles, book excerpts, subtitles, anything
- Every sentence is broken down with an English translation, vocabulary above A2 level (tagged B1/B2/C1), a grammar explanation, and useful related phrases

**Conversation Tutor**
- Chat freely in Swedish with an AI tutor
- Get gentle corrections when you make mistakes, with explanations of why
- Tutor suggests more natural and advanced phrasing as you progress

## Tech Stack

- React + Vite
- Gemini 2.5 Pro API

## Getting Started

1. Clone the repo
   ```bash
   git clone https://github.com/zengeg/svensk-daglig.git
   cd svensk-daglig
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Add your Gemini API key — create a `.env` file in the root:
   ```
   VITE_GEMINI_KEY=your_api_key_here
   ```
   Get a free key at [aistudio.google.com](https://aistudio.google.com)

4. Start the dev server
   ```bash
   npm run dev
   ```

5. Open `http://localhost:5173`

## Target User

Designed for Swedish learners at A2 level working toward B2/C1. The analyzer focuses on vocabulary and grammar points that are most useful for intermediate learners making the jump to advanced.
