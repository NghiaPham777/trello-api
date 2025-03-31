import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  closestCorners,
  defaultDropAnimationSideEffects,
  getFirstCollision,
  pointerWithin,
  useSensor,
  useSensors
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import Box from '@mui/material/Box'
import { cloneDeep, isEmpty } from 'lodash'
import { generatePlaceholderCard } from '~/utils/formatters'
import { useCallback, useEffect, useRef, useState } from 'react'
import { mapOrder } from '~/utils/sorts'
import Column from './ListColumns/Column/Column'
import Card from './ListColumns/Column/ListCards/Card/Card'
import ListColumns from './ListColumns/ListColumns'

const ACTIVE_DRAG_ITEM_TYPE = {
  COLUMN: 'ACTIVE_DRAG_ITEM_TYPE_COLUMN',
  CARD: 'ACTIVE_DRAG_ITEM_TYPE_CARD'
}
function BoardContent({ board }) {
  //FIX: click gọi event = cách yêu cầu di chuyển 10px
  const mouseSensor = useSensor(MouseSensor, { activationConstraint: { distance: 10 } })

  //FIX: nhấn giữ 250ms và dung sai của cảm ứng 500px thì kích hoạt event
  const touchSensor = useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 500 } })
  const sensors = useSensors(mouseSensor, touchSensor)

  const [orderedColumns, setOrderedColumns] = useState([])
  //NOTE: Cùng 1 thời điểm chỉ có 1 phần tử đang được kéo (col/card)
  const [activeDragItemId, setActiveDragItemId] = useState(null)
  const [activeDragItemType, setActiveDragItemType] = useState(null)
  const [activeDragItemData, setActiveDragItemData] = useState(null)
  const [oldColWhenDraggingCard, setOldColWhenDraggingCard] = useState(null)

  //Điểm va chạm cuối cùng trước đó
  const lastOverId = useRef(null)

  useEffect(() => {
    setOrderedColumns(mapOrder(board?.columns, board?.columnOrderIds, '_id'))
  }, [board])

  // Tìm Column theo CardId
  const findColumnByCardId = (cardId) => {
    return orderedColumns.find(column => column?.cards?.map(card => card._id)?.includes(cardId))
  }
  //FUNC: Cập nhật state trong TH di chuyển card giữa 2 col khác nhau
  const moveCardBetweenDifferentColumns = (
    overColumn,
    overCardId,
    active,
    over,
    activeCoLum,
    activeDraggingCardId,
    activeDraggingCardData
  ) => {
    setOrderedColumns(prevColumns => {
      const overCardIndex = overColumn?.cards?.findIndex(card => card._id === overCardId)
      
      let newCardIndex
      const isBelowOverItem = active.rect.current.translated && 
        active.rect.current.translated.top > over.rect.top + over.rect.height
        const modifiler = isBelowOverItem ? 1 : 0
        newCardIndex = overCardIndex >= 0 ? overCardIndex + modifiler : overColumn?.cards?.length + 1

        //NOTE: Clone mảng orderedColumnsState cũ ra 1 cái mới để xử lý data rồi return - update lại orderedColumnsState mới
        const nextColumns = cloneDeep(prevColumns)
        const nextActiveColumn = nextColumns.find(column => column._id === activeCoLum._id)
        const nextOverColumn = nextColumns.find(column => column._id === overColumn._id)

        // Col cũ
        if (nextActiveColumn) {
          // xoá card ở col cũ nếu kéo card qua col khác
          nextActiveColumn.cards = nextActiveColumn.cards.filter(card => card._id !== activeDraggingCardId)
          //Thêm FE_PLaceholderCard nếu Col rỗng (bị kéo hết card đi)
          if (isEmpty(nextActiveColumn.cards)) {
            nextActiveColumn.cards = [generatePlaceholderCard(nextActiveColumn)]
            // console.log('Card cuối cùng bị kéo')
          }
          // Cập nhật lại cardOrderIds sau khi thay đổi list card
          nextActiveColumn.cardOrderIds = nextActiveColumn.cards.map(card => card._id)
        }

        // Col mới
        if (nextOverColumn) {
          // kiểm tra xem card đang kéo có tồn tại ở overColumn chưa, nó có thì xoá trước
          nextOverColumn.cards = nextOverColumn.cards.filter(card => card._id !== activeDraggingCardId)
          // Thêm card đang kéo vào orverColumn tại vị trí index mới
          nextOverColumn.cards = nextOverColumn.cards.toSpliced(
            newCardIndex,
            0,
            { ...activeDraggingCardData, columnId: nextOverColumn._id }
          )
          //Xoá PlaceholderCard đi nếu đang tồn tại
          nextOverColumn.cards = nextOverColumn.cards.filter(card => !card.FE_PlaceholderCard)
          // Cập nhật lại array cardOrderIds sau khi thay đổi card
          nextOverColumn.cardOrderIds = nextOverColumn.cards.map(card => card._id)

        }
      return nextColumns
    })
  }

  const handleDragStart = (event) => {
    // console.log('handleDragStart', event)
    setActiveDragItemId(event?.active?.id)
    setActiveDragItemType(event?.active?.data?.current?.columnId ? ACTIVE_DRAG_ITEM_TYPE.CARD : ACTIVE_DRAG_ITEM_TYPE.COLUMN)
    setActiveDragItemData(event?.active?.data?.current)

    if (event?.active?.data?.current?.columnId) {
      setOldColWhenDraggingCard (findColumnByCardId(event?.active?.id))
    }
  }
  // NOTE: Trigger trong quá trình kéo
  const handleDragOver = (event) => {
    if (activeDragItemType === ACTIVE_DRAG_ITEM_TYPE.COLUMN) return // k làm gì khi kéo col

    //NOTE: Kéo Card thì cẩn xử lý thêm
    // console.log('handleDragOver: ', event)
    const { active, over } = event
    if (!active || !over) return

    const { id: activeDraggingCardId, data: { current: activeDraggingCardData } } = active
    const { id: overCardId } = over

    //NOTE: Tìm 2 column theo cardId
    const activeCoLum = findColumnByCardId(activeDraggingCardId)
    const overColumn = findColumnByCardId(overCardId)

    if (!activeCoLum || !overColumn) return

    //Nếu kéo card vào col khác thì xử lý trong lúc kéo (handleOver), còn kéo xong rồi thì handleEnd
    if (activeCoLum._id !== overColumn._id) {
      moveCardBetweenDifferentColumns(
        overColumn,
        overCardId,
        active,
        over,
        activeCoLum,
        activeDraggingCardId,
        activeDraggingCardData
      )
    }
  }
  // Note: Trigger sau khi thả
  const handleDragEnd = (event) => {
    // console.log('handleDragEnd', event)
    const { active, over } = event
    if (!active || !over) return
    //Xử lý kéo thả Card
    if (activeDragItemType === ACTIVE_DRAG_ITEM_TYPE.CARD) {

      const { id: activeDraggingCardId, data: { current: activeDraggingCardData } } = active
      const { id: overCardId } = over

      //NOTE: Tìm 2 column theo cardId
      const activeCoLum = findColumnByCardId(activeDraggingCardId)
      const overColumn = findColumnByCardId(overCardId)

      if (!activeCoLum || !overColumn) return
      // Hành động kéo thả card giữa 2 col khác nhau
      if (oldColWhenDraggingCard._id !== overColumn._id) {
        moveCardBetweenDifferentColumns(
          overColumn,
          overCardId,
          active,
          over,
          activeCoLum,
          activeDraggingCardId,
          activeDraggingCardData
        )
      } else {
        // console.log('hành động kéo thả card trong 1 col')
        const oldCardIndex = oldColWhenDraggingCard?.cards?.findIndex(c => c._id === activeDragItemId)
        const newCardIndex = overColumn?.cards?.findIndex(c => c._id === overCardId)
        const dndOrderedCards = arrayMove(oldColWhenDraggingCard?.cards, oldCardIndex, newCardIndex)
        setOrderedColumns(prevColumns => {
          //NOTE: Clone mảng orderedColumnsState cũ ra 1 cái mới để xử lý data rồi return 
          // - update lại orderedColumnsState mới
          const nextColumns = cloneDeep(prevColumns)

          //Tìm tới Col mà chúng ta đang thả
          const targetColumn = nextColumns.find(col => col._id === overColumn._id)

          targetColumn.cards = dndOrderedCards
          targetColumn.cardOrderIds = dndOrderedCards.map(card => card._id)
          return nextColumns
        })
      }
    }

    // Xử lý kéo thả Col
    if (activeDragItemType === ACTIVE_DRAG_ITEM_TYPE.COLUMN) {
      if (active.id !== over.id) {
        const oldColIndex = orderedColumns.findIndex(c => c._id === active.id)
        const newColIndex = orderedColumns.findIndex(c => c._id === over.id)
        //Sort columns of dndKit before
        const dndOrderedColumns = arrayMove(orderedColumns, oldColIndex, newColIndex)
        //xử lý gọi APIs
        // const dndOrderedColumnsIds = dndOrderedColumns.map(c => c._id)
        // console.log('dndOrderedColumnsIds: ',dndOrderedColumnsIds)
        // console.log('dndOrderedColumns: ',dndOrderedColumns)
        setOrderedColumns(dndOrderedColumns)
      }
    }
    // Dữ liệu sau khi thả luôn phải luôn phải đưa về default (null value)
    setActiveDragItemId(null)
    setActiveDragItemType(null)
    setActiveDragItemData(null)
    setOldColWhenDraggingCard (null)
  }

  const customDropAnimation = {
    sideEffects: defaultDropAnimationSideEffects ({ styles: { active: { opacity: '0.5' } } })
  }

  const collisionDetectionStrategy = useCallback((args) => {
    if (activeDragItemType === ACTIVE_DRAG_ITEM_TYPE.COLUMN) {
      return closestCorners({ ...args })
    }

    const pointerIntersection = pointerWithin(args)

    if (!pointerIntersection?.length) return

    // const intersections = !!pointerIntersection?.length
    //   ? pointerIntersection 
    //   : rectIntersection(args)
    //Tìm overId đầu tiên trong đám pointerIntersection ở trên
    let overId = getFirstCollision(pointerIntersection, 'id')
    if (overId) {
      //Nếu over là col thì tìm tới cardId gần nhất bằng closestCorners
      const checkColumn = orderedColumns.find(column => column._id === overId)
      if (checkColumn) {
        // console.log('overId before: ', overId)
        overId = closestCorners({
          ...args,
          droppableContainers: args.droppableContainers.filter(container => {
            return (container.id !== overId) && (checkColumn?.cardOrderIds?.includes(container.id))
          })
        })[0]?.id
        // console.log('overId after: ', overId)
      }
      lastOverId.current = overId
      return [{ id: overId }]
    }

    return lastOverId.current ? [{ id: lastOverId.current }] : []
  }, [activeDragItemType, orderedColumns])
  return (
    <DndContext 
      sensors={sensors}
      // thuật toán va chạm góc (card có cover lớn sẽ không hoạt động)
      // collisionDetection={closestCorners} bug flickering + sai lệch data
      collisionDetection={collisionDetectionStrategy} //Custom nâng cao thuật toán va chạm

      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd} 
    >
      <Box sx={{
        bgcolor: (theme) => (theme.palette.mode === 'dark' ? '#34495e' : '#1976d2'),
        width: '100%',
        height: (theme) => theme.trello.boardContentHeight,
        p: '10px 0'
      }}>
        <ListColumns columns={orderedColumns}/>
        <DragOverlay dropAnimation={customDropAnimation}>
          {!activeDragItemType && null}
          {(activeDragItemType === ACTIVE_DRAG_ITEM_TYPE.COLUMN) && <Column column={activeDragItemData}/>}
          {(activeDragItemType === ACTIVE_DRAG_ITEM_TYPE.CARD) && <Card card={activeDragItemData}/>}
        </DragOverlay>
      </Box>
    </DndContext>
  )
}

export default BoardContent
