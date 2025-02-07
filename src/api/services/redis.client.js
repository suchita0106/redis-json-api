import 'dotenv/config';
import { createClient } from 'redis';
import md5 from 'md5';
import appConfig from '../../configs/app.config.js';
import logger from '../../configs/logger.config.js'; // Import Winston logger

const { REDIS_PORT } = appConfig;

const client = createClient(REDIS_PORT);
client.connect();

client.on('error', (err) => {
  logger.error("Redis connection error", { error: err.message });
});

client.on('connect', () => {
  logger.info("Connected to Redis successfully");
});

/**
 * Retrieve a plan from Redis.
 * @param {string} key - The plan ID.
 * @returns {object|boolean} - The stored plan object or false if not found.
 */
const findPlan = async (key) => {
  logger.debug("Searching for plan in Redis", { planId: key });

  const value = await client.hGetAll(key);

  if (Object.keys(value).length === 0) {
    logger.warn("Plan not found in Redis", { planId: key });
    return false;
  }

  logger.info("Plan retrieved from Redis", { planId: key });
  return value;
};

/**
 * Store a new plan in Redis.
 * @param {object} body - The plan data.
 * @returns {object} - The stored plan.
 */
const addPlan = async (body) => {
  logger.info("Received request to add plan", { planId: body.objectId });

  const ETag = md5(JSON.stringify(body));

  // Check if key already exists
  const existingType = await client.type(body.objectId);
  if (existingType !== 'hash' && existingType !== 'none') {
    logger.warn("Existing key has a different type, deleting it", { planId: body.objectId, type: existingType });
    await client.del(body.objectId);
  }

  // Store the plan in Redis
  await client.hSet(body.objectId, {
    plan: JSON.stringify(body),
    ETag: ETag,
    objectId: body.objectId
  });

  logger.info("Plan stored in Redis", { planId: body.objectId, ETag });

  // Retrieve and return the stored plan
  const newPlan = await findPlan(body.objectId);
  return newPlan;
};

/**
 * Delete a plan from Redis by ID.
 * @param {string} planId - The ID of the plan to delete.
 * @returns {boolean} - True if deleted, false otherwise.
 */
const deleteByPlanId = async (planId) => {
  logger.info("Received request to delete plan", { planId });

  const deleted = await client.del(planId);
  if (deleted) {
    logger.info("Plan deleted from Redis", { planId });
    return true;
  }

  logger.warn("Plan deletion failed, plan not found", { planId });
  return false;
};

export { findPlan, addPlan, deleteByPlanId };