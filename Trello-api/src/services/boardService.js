import { slugify } from '~/utils/formatter'
import { boardModel } from '~/models/boardModel'

const createNew = async (reqBody) => {
  // eslint-disable-next-line no-useless-catch
  try {
    const newBoard = {
      ...reqBody,
      slug: slugify(reqBody.title)
    }

    //Gọi tới Model xử lý newBoard vào DB
    const createdBoard = await boardModel.createNew(newBoard)
    console.log(createdBoard)

    const getNewBoard = await boardModel.findById(createdBoard.insertedId)
    console.log(getNewBoard)

    return getNewBoard
  } catch (error) { throw error }
}

export const boardService = {
  createNew
}