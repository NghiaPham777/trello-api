import Joi from 'joi'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'

const createNew = async (req, res, next) => {
  const correctCondition = Joi.object({
    title: Joi.string().required().min(3).max(50).trim().strict().messages({
      'any.required': 'custom message error in boardValidation',
      'string.empty': 'custom message error in boardValidation',
      'string.min': 'custom message error in boardValidation',
      'string.max': 'custom message error in boardValidation',
      'string.trim': 'custom message error in boardValidation'
    }),
    description: Joi.string().required().min(3).max(256).trim().strict()
  })

  try {

    await correctCondition.validateAsync(req.body, { abortEarly: false })
    //Validate data xong -> req sang Controller
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, new Error(error).message))
  }

}

export const boardValidation = {
  createNew
}