# Veil - A Space for Your Dreams

"Begin with whatever remains. A quiet place to reconstruct a dream before it fades."

Veil is an AI-native dream journaling app designed to help you capture, explore, and understand your subconscious world. It provides a serene environment to record your dreams, offers deep psychological insights, and integrates symbolic guidance through Tarot.

## Core Features

- **Guided Dream Capture**: A gentle, conversational interface that helps you reconstruct your dreams with minimal, thoughtful follow-up questions.
- **Multidimensional Interpretation**:
  - **Initial Analysis**: Grounded in Jungian collective unconscious and Freudian emotional psychology.
  - **Life Connection**: Maps dream symbols to your current waking life events for personalized resonance.
  - **Eastern Philosophy**: Supplements with macro-level insights from I Ching and Taoist perspectives on energy and balance.
- **The Oracle (Tarot)**: An immersive, ritualistic Tarot drawing experience for final symbolic confirmation and integrated insight.
- **Dream Archive**: Securely stores your dream fragments and their full interpretations in a beautiful, searchable history.
- **Shareable Posters**: Generate and share minimalist posters of your dream narratives and insights with friends or on social media.

## User Flow

1. **Descent**: Start by describing whatever fragments of your dream you remember.
2. **Expansion**: Veil asks a few targeted questions to clarify the atmosphere and symbols.
3. **Synthesis**: AI generates a structured narrative and a 3-part psychological interpretation.
4. **Resonance**: Optionally share a life event to see how it mirrors your dream's hidden pressures.
5. **The Oracle**: Draw a Tarot card from a 23-card fan for a final layer of symbolic confirmation.
6. **Preservation**: View the complete summary and save it to your local archive.

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Styling**: Tailwind CSS + Custom CSS for ethereal animations
- **LLM Integration**: OpenAI/Groq via serverless API routes
- **Storage**: Browser `localStorage` (Privacy-focused, local-first)
- **Image Processing**: `html-to-image` for sharing posters
- **Deployment**: Vercel

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up Environment Variables**:
   Create a `.env.local` file with your API keys:
   ```env
   OPENAI_API_KEY=your_key_here
   ```

3. **Run the development server**:
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) with your browser to begin the descent.

## Deployment

The project is optimized for **Vercel**. Simply connect your GitHub repository and set the environment variables in the Vercel dashboard.

---
*Dreams are personal echoes. Veil provides reflections, not diagnoses.*
