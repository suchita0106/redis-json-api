import { findPlan, addPlan, deleteByPlanId } from '../services/redis.client.js';
import { validate } from '../utils/schemaValidation.js';
import logger from '../../configs/logger.config.js';

import {
  BadRequestError,
  InternalServerError,
  ResourceNotFoundError,
  PreConditionFailedError,
  conflictHandler,
  createHandler,
  noContentHandler,
  notModifiedHandler,
  successHandler,
} from '../utils/error.util.js';

const getPlan = async (req, res, next) => { 
  try {
    logger.info("Received request to get plan", { planId: req.params.planId });

    const { params } = req;
    const { planId } = params;

    if (!planId || planId === '{}') {
      logger.warn("Invalid planId received", { planId });
      throw new BadRequestError(`Invalid planId`);
    }

    const value = await findPlan(planId);
    if (!value) {
      logger.warn("Plan not found in Redis", { planId });
      throw new ResourceNotFoundError(`Plan not found`);
    }

    logger.debug("Plan found in Redis", { planId, ETag: value.ETag });

    // Conditional read based on `if-none-match` header
    if (req.headers['if-none-match'] && value.ETag === req.headers['if-none-match']) {
      logger.info("Plan has not changed, returning 304", { planId });
      res.setHeader('ETag', value.ETag);
      return notModifiedHandler(res, { message: 'Plan has not changed' });
    }

    logger.info("Plan has changed, returning updated data", { planId });
    res.setHeader('ETag', value.ETag);
    return successHandler(res, { message: 'Plan has changed', plan: JSON.parse(value.plan) });

  } catch (err) {
    logger.error("Error in getPlan", { error: err.message });
    next(err);
  }
};

const savePlan = async (req, res, next) => {
  logger.info("Received request to save plan");

  try {
    if (!validate(req.body)) {
      logger.warn("Validation failed for request body", { requestBody: req.body });
      throw new BadRequestError("Invalid request body");
    }

    logger.debug("Checking if plan already exists in Redis", { planId: req.body.objectId });
    const existingPlan = await findPlan(req.body.objectId);

    if (existingPlan) {
      logger.warn("Plan already exists", { planId: req.body.objectId, ETag: existingPlan.ETag });
      res.setHeader('ETag', existingPlan.ETag);
      return conflictHandler(res, { message: 'Item already exists' });
    }

    logger.info("Adding new plan to Redis", { planId: req.body.objectId });
    const newPlan = await addPlan(req.body);
    const { ETag } = newPlan;
    res.setHeader('ETag', ETag);

    logger.info("Plan successfully added", { planId: req.body.objectId, ETag });

    return createHandler(res, { message: 'Item added', ETag, planId: req.body.objectId });

  } catch (err) {
    logger.error("Error in savePlan", { error: err.message });
    next(err);
  }
};

const deletePlan = async (req, res, next) => {
  logger.info("Received request to delete plan", { planId: req.params.planId });

  try {
    const { params } = req;
    const { planId } = params;

    if (!planId || planId === '{}') {
      logger.warn("Invalid planId received", { planId });
      throw new BadRequestError(`Invalid planId`);
    }

    const value = await findPlan(planId);
    if (!value) {
      logger.warn("Plan not found in Redis", { planId });
      throw new ResourceNotFoundError(`Plan not found`);
    }

    logger.debug("Plan found, checking for conditional delete", { planId, ETag: value.ETag });

    if (req.headers['if-match']) {
      if (value.ETag === req.headers['if-match']) {
        if (await deleteByPlanId(planId)) {
          logger.info("Plan deleted successfully", { planId });
          return noContentHandler(res, { message: "Plan deleted", planId });
        }
      } else {
        logger.warn("ETag mismatch for conditional delete", { planId });
        throw new PreConditionFailedError("ETag provided is not valid");
      }
    } else {
      if (await deleteByPlanId(planId)) {
        logger.info("Plan deleted successfully", { planId });
        return noContentHandler(res, { message: "Plan deleted", planId });
      }
    }

    logger.error("Failed to delete plan", { planId });
    throw new InternalServerError("Item not deleted");

  } catch (err) {
    logger.error("Error in deletePlan", { error: err.message });
    next(err);
  }
};

export { getPlan, savePlan, deletePlan };