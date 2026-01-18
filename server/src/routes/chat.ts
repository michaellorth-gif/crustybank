import { Router } from 'express'
import { z } from 'zod'
import OpenAI from 'openai'
import { AuthRequest } from '../middleware/auth.js'

const router = Router()

const chatSchema = z.object({
  message: z.string().min(1),
  history: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
    })
  ).optional(),
})

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

router.post('/', async (req: AuthRequest, res) => {
  try {
    const { message, history = [] } = chatSchema.parse(req.body)

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      // Return a fallback response if no API key
      return res.json({
        message: "I'm your personal assistant! To enable AI-powered responses, please configure the OPENAI_API_KEY environment variable. In the meantime, I can help you navigate the app. Try using the Tasks, Goals, Calendar, or Notes features!",
      })
    }

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: `You are a helpful personal assistant. You help users manage their tasks, goals, calendar, and notes.
Be friendly, concise, and helpful. If asked about specific features, explain how to use them.
Keep responses brief but informative.`,
      },
      ...history.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      { role: 'user', content: message },
    ]

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages,
      max_tokens: 500,
      temperature: 0.7,
    })

    const responseMessage = completion.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response."

    res.json({ message: responseMessage })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message })
    }
    console.error(error)
    res.status(500).json({ message: 'Failed to process chat message' })
  }
})

export default router
