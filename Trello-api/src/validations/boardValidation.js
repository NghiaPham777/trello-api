import Joi from 'joi'
import { StatusCodes } from 'http-status-codes'

const createNew = async (req, res, next) => {
  const correctCondition = Joi.object({
    title: Joi.string().required().min(3).max(50).trim().strict().messages({
      'any.required': 'custom message error',
      'string.empty': 'custom message error',
      'string.min': 'custom message error',
      'string.max': 'custom message error',
      'string.trim': 'custom message error'
    }),
    description: Joi.string().required().min(3).max(256).trim().strict()
  })

  try {

    await correctCondition.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    console.log(error)
    // console.log(new Error(error))
    res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({
      errors: new Error(error).message
    })
  }

}

export const boardValidation = {
  createNew
}