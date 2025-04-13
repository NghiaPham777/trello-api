import { StatusCodes } from 'http-status-codes'
// import ApiError from '~/utils/ApiError'
import { boardService } from '~/services/boardService'

const createNew = async (req, res, next) => {
  try {
    // console.log('request body: ',req.body)
    // console.log('request body: ',req.body)
    
    //Dieu huong data sang Service
    const createdBoard = await boardService.createNew(req.body)

    // throw new ApiError(StatusCodes.BAD_GATEWAY, 'test error')

    //Response result to Client
    res.status(StatusCodes.CREATED).json(createdBoard)
    // res.status(StatusCodes.CREATED).json({ message: 'POST from Controller'})
  } catch (error) { next(error) }
}

export const boardController = {
  createNew
}
