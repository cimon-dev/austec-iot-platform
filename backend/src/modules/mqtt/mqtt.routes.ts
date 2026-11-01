import { Router } from 'express';
import { MqttGateway } from '../../services/mqtt.gateway.js';
import { MqttController } from './mqtt.controller.js';
import { createRouterFromController } from '../../core/decorators/index.js';

export function createMqttRouter(mqttGateway: MqttGateway): Router {
  const controller = new MqttController(mqttGateway);
  return createRouterFromController(controller);
}

