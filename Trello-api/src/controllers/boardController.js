import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'

const createNew = async (req, res, next) => {
  try {
    // console.log('request body: ',req.body)
    // console.log('request body: ',req.body)

    // throw new ApiError(StatusCodes.BAD_GATEWAY, 'test error')

    //Response result to Client
    res.status(StatusCodes.CREATED).json({ message: 'Post from Controller: API create new boards' })
  } catch (error) { next(error) }
}

export const boardController = {
  createNew
}
