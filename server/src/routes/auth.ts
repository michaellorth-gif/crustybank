import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { db, schema } from '../db/index.js'
import { eq } from 'drizzle-orm'

const router = Router()

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

router.post('/register', async (req, res) => {
  try {
    // Deployment hardening: once the firm's accounts exist, set
    // DISABLE_REGISTRATION=true so strangers on the internet can't sign up.
    if (process.env.DISABLE_REGISTRATION === 'true') {
      return res.status(403).json({ message: 'Registration is disabled. Contact the administrator.' })
    }

    const { name, email, password } = registerSchema.parse(req.body)

    // Check if user exists
    const existing = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1)

    if (existing.length > 0) {
      return res.status(400).json({ message: 'Email already registered' })
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    // Create user (first user becomes admin)
    const existingUsers = await db.select().from(schema.users).limit(1)
    const isFirstUser = existingUsers.length === 0

    const [user] = await db
      .insert(schema.users)
      .values({ name, email, passwordHash, role: isFirstUser ? 'admin' : 'user' })
      .returning({ id: schema.users.id, email: schema.users.email, name: schema.users.name, role: schema.users.role })

    // Generate token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    )

    res.status(201).json({ user, token })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message })
    }
    console.error(error)
    res.status(500).json({ message: 'Registration failed' })
  }
})

router.post('/login', async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body)

    // Find user
    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1)

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }

    // Check password
    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }

    // Generate token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    )

    res.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      token,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message })
    }
    console.error(error)
    res.status(500).json({ message: 'Login failed' })
  }
})

export default router
