"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { NoteForm } from './note-form'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { formatDate } from '@/lib/utils'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

export function NotesList({ notes, entityType, entityId, onRefresh }) {
  const [showForm, setShowForm] = useState(false)
  const [editingNote, setEditingNote] = useState(null)
  const [deleteNote, setDeleteNote] = useState(null)
  const { toast } = useToast()

  const handleCreate = async (data) => {
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to create note')
      toast({ title: 'Note added successfully' })
      setShowForm(false)
      onRefresh()
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    }
  }

  const handleUpdate = async (data) => {
    try {
      const res = await fetch(`/api/notes/${editingNote.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to update note')
      toast({ title: 'Note updated successfully' })
      setEditingNote(null)
      onRefresh()
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    }
  }

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/notes/${deleteNote.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete note')
      toast({ title: 'Note deleted successfully' })
      setDeleteNote(null)
      onRefresh()
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Notes</CardTitle>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Note
        </Button>
      </CardHeader>
      <CardContent>
        {showForm && (
          <div className="mb-4 rounded-lg border p-4">
            <NoteForm
              entityType={entityType}
              entityId={entityId}
              onSubmit={handleCreate}
              onCancel={() => setShowForm(false)}
            />
          </div>
        )}

        {editingNote && (
          <div className="mb-4 rounded-lg border p-4">
            <NoteForm
              entityType={entityType}
              entityId={entityId}
              initialData={editingNote}
              onSubmit={handleUpdate}
              onCancel={() => setEditingNote(null)}
            />
          </div>
        )}

        {notes.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">No notes yet</p>
        ) : (
          <div className="space-y-4">
            {notes.map((note) => (
              <div
                key={note.id}
                className="rounded-lg border p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {note.title && (
                      <h4 className="font-medium">{note.title}</h4>
                    )}
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {note.content}
                    </p>
                    <Badge variant="outline" className="mt-2">
                      {formatDate(note.date)}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setEditingNote(note)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setDeleteNote(note)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <ConfirmDialog
          open={!!deleteNote}
          onOpenChange={() => setDeleteNote(null)}
          title="Delete Note"
          description="Are you sure you want to delete this note? This action cannot be undone."
          confirmText="Delete"
          onConfirm={handleDelete}
        />
      </CardContent>
    </Card>
  )
}
