import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { AnimatePresence, motion } from 'framer-motion'
import { taskItemVariants } from '@/hooks/useAnimations'
import TaskItem from '@/components/TaskItem'
import useTaskStore from '@/store/tasks'

function SortableItem({ task, isAnyDragging }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const theme = useTaskStore(s => s.settings.theme)
  const isDark = theme === 'dark'
  const innerRef = useRef(null)
  const measuredHeight = useRef(0)

  // Measure height continuously so we have it before drag starts
  useEffect(() => {
    if (innerRef.current && !isDragging) {
      measuredHeight.current = innerRef.current.getBoundingClientRect().height
    }
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    // Smooth transition for sibling items sliding out of the way
    transition: transition || (isAnyDragging ? 'transform 200ms ease' : undefined),
    position: 'relative',
  }

  // When this specific item is being dragged, show a placeholder matching its height
  if (isDragging) {
    return (
      <div ref={setNodeRef} style={{ ...style, zIndex: 0 }}>
        <div
          className={`mx-3 mb-1 rounded-xl ${
            isDark ? 'bg-white/[0.03]' : 'bg-black/[0.03]'
          }`}
          style={{
            height: measuredHeight.current || 'auto',
            border: `1px dashed ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
          }}
        />
      </div>
    )
  }

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout={!isAnyDragging}
      variants={taskItemVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <div ref={innerRef}>
        <TaskItem
          task={task}
          dragHandleProps={{ ...attributes, ...listeners }}
        />
      </div>
    </motion.div>
  )
}

export default function SortableTaskList({ tasks }) {
  const reorderTasks = useTaskStore(s => s.reorderTasks)
  const [activeId, setActiveId] = useState(null)

  const activeTask = useMemo(
    () => activeId ? tasks.find(t => t.id === activeId) : null,
    [activeId, tasks]
  )

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = useCallback((event) => {
    setActiveId(event.active.id)
  }, [])

  const handleDragEnd = useCallback((event) => {
    setActiveId(null)
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = tasks.findIndex(t => t.id === active.id)
    const newIndex = tasks.findIndex(t => t.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const newOrder = [...tasks]
    const [moved] = newOrder.splice(oldIndex, 1)
    newOrder.splice(newIndex, 0, moved)

    reorderTasks(newOrder.map(t => t.id))
  }, [tasks, reorderTasks])

  const handleDragCancel = useCallback(() => {
    setActiveId(null)
  }, [])

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext
        items={tasks.map(t => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <AnimatePresence initial={false}>
          {tasks.map(task => (
            <SortableItem
              key={task.id}
              task={task}
              isAnyDragging={activeId !== null}
            />
          ))}
        </AnimatePresence>
      </SortableContext>

      {createPortal(
        <DragOverlay dropAnimation={{
          duration: 200,
          easing: 'cubic-bezier(0.2, 0, 0, 1)',
        }}>
          {activeTask && (
            <div
              style={{
                borderRadius: 12,
                boxShadow: '0 12px 32px rgba(0,0,0,0.25), 0 2px 8px rgba(0,0,0,0.15)',
                transform: 'scale(1.02)',
                opacity: 0.95,
              }}
            >
              <TaskItem task={activeTask} />
            </div>
          )}
        </DragOverlay>,
        document.body
      )}
    </DndContext>
  )
}
