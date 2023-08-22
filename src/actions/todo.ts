"use server"

import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { Todo } from "@prisma/client"
import { getServerSession } from "next-auth"
import { revalidatePath } from "next/cache"

export async function addTodo(data: FormData) {
  const text = data.get("text")?.toString()

  if (!text) return

  const session = await getServerSession(authOptions)

  if (!session) {
    throw new Error("Not logged in")
  }

  await prisma.todo.create({
    data: {
      userId: session.user.id,
      text,
    },
  })

  revalidatePath("/")
}

export async function completeTodo(id: string) {
  const session = await getServerSession(authOptions)

  if (!session) {
    throw new Error("Not logged in")
  }

  await prisma.todo.update({
    data: {
      completedAt: new Date(),
    },
    where: {
      id,
    },
  })

  revalidatePath("/")
}

export async function undoCompleteTodo(id: string) {
  const session = await getServerSession(authOptions)

  if (!session) {
    throw new Error("Not logged in")
  }

  await prisma.todo.update({
    data: {
      completedAt: null,
    },
    where: {
      id,
    },
  })

  revalidatePath("/")
}

export async function resetTimer(id: string) {
  const session = await getServerSession(authOptions)

  if (!session) {
    throw new Error("Not logged in")
  }

  await prisma.todo.update({
    data: {
      createdAt: new Date(),
    },
    where: {
      id,
    },
  })

  revalidatePath("/")
}

export async function editTodo(id: string, data: FormData) {
  const text = data.get("newText")?.toString()
  const session = await getServerSession(authOptions)

  if (!session) {
    throw new Error("Not logged in")
  }

  await prisma.todo.update({
    data: {
      text,
    },
    where: {
      id,
    },
  })

  revalidatePath("/")
}

export async function deleteTodo(id: string) {
  const session = await getServerSession(authOptions)

  if (!session) {
    throw new Error("Not logged in")
  }

  await prisma.todo.delete({
    where: {
      id,
    },
  })

  revalidatePath("/")
}

export async function getTodoItems(): Promise<Todo[]> {
  const session = await getServerSession(authOptions)

  if (!session) {
    throw new Error("Not logged in")
  }

  const expiredCompleted = new Date()
  const expired = new Date()

  expiredCompleted.setHours(expiredCompleted.getHours() - 6)
  expired.setHours(expired.getHours() - 36)

  const data = await prisma.todo.findMany({
    where: {
      userId: session.user.id,
      createdAt: { gte: expired },
      AND: [
        {
          OR: [
            { completedAt: null },
            {
              completedAt: {
                gte: expiredCompleted,
              },
            },
          ],
        },
      ],
    },
  })

  return data
}
