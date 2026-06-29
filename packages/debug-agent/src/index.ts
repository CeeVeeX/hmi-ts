import { EventEmitter, type ICommandPayload, type IDebugAgent, generateUUID } from '@hmi-ts/core'
import mqtt from 'mqtt'

export interface DebugAgentOptions {
  deviceAddress: string
  brokerUrl?: string
  username?: string
  password?: string
}

export class DebugAgent extends EventEmitter implements IDebugAgent {
  connection?: mqtt.MqttClient

  clientId?: string

  constructor(private readonly options: DebugAgentOptions) {
    super()
  }

  async connect(clientId: string): Promise<void> {
    this.clientId = clientId
    const { brokerUrl, username, password } = this.options

    this.connection = mqtt.connect(brokerUrl || 'ws://127.0.0.1:58080', {
      username,
      password,
      clientId: clientId || generateUUID(),
    })

    const command = `command/${clientId}/#`
    const commandAll = `command/all/#`

    this.connection.on('connect', () => {
      this.push('debug_agent_connected', { uuid: generateUUID(), clientId: this.clientId })
      console.log('Connected to MQTT broker')
      this.emit('connected')
      this.connection?.subscribe(command)
      this.connection?.subscribe(commandAll)
    })

    this.connection.on('close', () => {
      console.log('Disconnected from MQTT broker')
      this.emit('disconnected', new Error('MQTT connection closed'))
    })

    this.connection.on('end', () => {
      console.log('MQTT connection ended')
      this.emit('destroyed', new Error('MQTT connection ended'))
    })

    this.connection.on('error', (error) => {
      this.emit('error', error)
      console.error('MQTT connection error:', error)
    })

    this.connection.on('message', (topic, message) => {
      try {
        console.log(`Received MQTT message on topic ${topic}:`, message.toString())
        const [fn, scope, command] = topic.split('/')
        if (fn === 'command' && (scope === this.clientId || scope === 'all')) {
          const payload = JSON.parse(message.toString()) as ICommandPayload

          this.emit('command', command, payload)
        }
      } catch (error) {
        console.error('Failed to parse MQTT message:', error)
      }
    })
  }

  /**
   * 主动推送调试信息到调试器
   */
  push(command: string, payload: ICommandPayload) {
    if (!this.clientId) {
      console.error('DebugAgent clientId is not set. Call connect() first.')
      return
    }

    const topic = `report/${this.clientId}/${command}`

    if (!this.connection || !this.connection.connected) {
      return
    }

    this.connection.publish(topic, JSON.stringify(payload))
  }

  /**
   * 返回指令执行结果给调试器
   */
  report(uuid: string, payload: object) {
    if (!this.clientId) {
      console.error('DebugAgent clientId is not set. Call connect() first.')
      return
    }

    const topic = `report/${this.clientId}/${uuid}`

    if (!this.connection || !this.connection.connected) {
      return
    }

    this.connection.publish(topic, JSON.stringify(payload))
  }
}
