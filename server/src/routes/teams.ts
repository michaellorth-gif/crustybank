import { Router, Response } from 'express'
import { z } from 'zod'
import { db } from '../db/index.js'
import { teams, teamMembers, users } from '../db/schema.js'
import { eq, and } from 'drizzle-orm'
import { AuthRequest } from '../middleware/auth.js'

const router = Router()

// Get all teams for the current user (owned or member of)
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!

    // Get teams where user is owner
    const ownedTeams = await db.select().from(teams).where(eq(teams.ownerId, userId))

    // Get teams where user is a member
    const memberTeams = await db
      .select({
        id: teams.id,
        name: teams.name,
        description: teams.description,
        ownerId: teams.ownerId,
        createdAt: teams.createdAt,
        updatedAt: teams.updatedAt,
      })
      .from(teamMembers)
      .innerJoin(teams, eq(teamMembers.teamId, teams.id))
      .where(eq(teamMembers.userId, userId))

    // Combine and deduplicate
    const allTeams = [...ownedTeams, ...memberTeams]
    const uniqueTeams = Array.from(new Map(allTeams.map(t => [t.id, t])).values())

    // Get member counts
    const teamsWithCounts = await Promise.all(
      uniqueTeams.map(async (team) => {
        const members = await db.select().from(teamMembers).where(eq(teamMembers.teamId, team.id))
        return { ...team, memberCount: members.length + 1 } // +1 for owner
      })
    )

    res.json(teamsWithCounts)
  } catch (error) {
    console.error('Error fetching teams:', error)
    res.status(500).json({ message: 'Failed to fetch teams' })
  }
})

// Create a new team
const createTeamSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
})

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!
    const data = createTeamSchema.parse(req.body)

    const [team] = await db.insert(teams).values({
      name: data.name,
      description: data.description,
      ownerId: userId,
    }).returning()

    res.status(201).json({ ...team, memberCount: 1 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid input', errors: error.errors })
    }
    console.error('Error creating team:', error)
    res.status(500).json({ message: 'Failed to create team' })
  }
})

// Get team members
router.get('/:teamId/members', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!
    const { teamId } = req.params

    // Check if user has access to this team
    const team = await db.select().from(teams).where(eq(teams.id, teamId)).get()
    if (!team) {
      return res.status(404).json({ message: 'Team not found' })
    }

    const isMember = await db
      .select()
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
      .get()

    if (team.ownerId !== userId && !isMember) {
      return res.status(403).json({ message: 'Access denied' })
    }

    // Get owner
    const owner = await db.select({ id: users.id, email: users.email, name: users.name, role: users.role })
      .from(users)
      .where(eq(users.id, team.ownerId))
      .get()

    // Get members
    const members = await db
      .select({
        id: teamMembers.id,
        teamId: teamMembers.teamId,
        userId: teamMembers.userId,
        role: teamMembers.role,
        joinedAt: teamMembers.joinedAt,
      })
      .from(teamMembers)
      .where(eq(teamMembers.teamId, teamId))

    // Attach user info to members
    const membersWithUsers = await Promise.all(
      members.map(async (member) => {
        const user = await db
          .select({ id: users.id, email: users.email, name: users.name, role: users.role })
          .from(users)
          .where(eq(users.id, member.userId))
          .get()
        return { ...member, user }
      })
    )

    res.json({
      owner: { ...owner, role: 'owner' },
      members: membersWithUsers,
    })
  } catch (error) {
    console.error('Error fetching team members:', error)
    res.status(500).json({ message: 'Failed to fetch team members' })
  }
})

// Add team member
const addMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'member']).default('member'),
})

router.post('/:teamId/members', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!
    const { teamId } = req.params
    const data = addMemberSchema.parse(req.body)

    // Check if user is team owner or admin
    const team = await db.select().from(teams).where(eq(teams.id, teamId)).get()
    if (!team) {
      return res.status(404).json({ message: 'Team not found' })
    }

    if (team.ownerId !== userId) {
      const membership = await db
        .select()
        .from(teamMembers)
        .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
        .get()
      if (!membership || membership.role !== 'admin') {
        return res.status(403).json({ message: 'Only team owner or admin can add members' })
      }
    }

    // Find user by email
    const userToAdd = await db.select().from(users).where(eq(users.email, data.email)).get()
    if (!userToAdd) {
      return res.status(404).json({ message: 'User not found' })
    }

    // Check if already a member
    const existingMember = await db
      .select()
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userToAdd.id)))
      .get()

    if (existingMember || userToAdd.id === team.ownerId) {
      return res.status(400).json({ message: 'User is already a member of this team' })
    }

    const [member] = await db.insert(teamMembers).values({
      teamId,
      userId: userToAdd.id,
      role: data.role,
    }).returning()

    res.status(201).json({
      ...member,
      user: { id: userToAdd.id, email: userToAdd.email, name: userToAdd.name, role: userToAdd.role },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid input', errors: error.errors })
    }
    console.error('Error adding team member:', error)
    res.status(500).json({ message: 'Failed to add team member' })
  }
})

// Remove team member
router.delete('/:teamId/members/:memberId', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!
    const { teamId, memberId } = req.params

    // Check if user is team owner or admin
    const team = await db.select().from(teams).where(eq(teams.id, teamId)).get()
    if (!team) {
      return res.status(404).json({ message: 'Team not found' })
    }

    if (team.ownerId !== userId) {
      const membership = await db
        .select()
        .from(teamMembers)
        .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
        .get()
      if (!membership || membership.role !== 'admin') {
        return res.status(403).json({ message: 'Only team owner or admin can remove members' })
      }
    }

    await db.delete(teamMembers).where(eq(teamMembers.id, memberId))
    res.status(204).send()
  } catch (error) {
    console.error('Error removing team member:', error)
    res.status(500).json({ message: 'Failed to remove team member' })
  }
})

// Update team
const updateTeamSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
})

router.patch('/:teamId', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!
    const { teamId } = req.params
    const data = updateTeamSchema.parse(req.body)

    const team = await db.select().from(teams).where(eq(teams.id, teamId)).get()
    if (!team) {
      return res.status(404).json({ message: 'Team not found' })
    }

    if (team.ownerId !== userId) {
      return res.status(403).json({ message: 'Only team owner can update team' })
    }

    const [updated] = await db
      .update(teams)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(eq(teams.id, teamId))
      .returning()

    res.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid input', errors: error.errors })
    }
    console.error('Error updating team:', error)
    res.status(500).json({ message: 'Failed to update team' })
  }
})

// Delete team
router.delete('/:teamId', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!
    const { teamId } = req.params

    const team = await db.select().from(teams).where(eq(teams.id, teamId)).get()
    if (!team) {
      return res.status(404).json({ message: 'Team not found' })
    }

    if (team.ownerId !== userId) {
      return res.status(403).json({ message: 'Only team owner can delete team' })
    }

    await db.delete(teams).where(eq(teams.id, teamId))
    res.status(204).send()
  } catch (error) {
    console.error('Error deleting team:', error)
    res.status(500).json({ message: 'Failed to delete team' })
  }
})

export default router
