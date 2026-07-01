import {
  EventEmitter,
  type IClient,
  type ICommandPayload,
  type IDebugAgent,
  type PacketFactory,
  generateUUID,
} from '@hmi-ts/core'
import mqtt from 'mqtt'

export interface DebugAgentOptions {
  deviceAddress: string
  brokerUrl?: string
  username?: string
  password?: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function replacer(key: string, val: any) {
  if (val instanceof Uint8Array) return Array.from(val)
  return val
}

export class DebugAgent<T extends PacketFactory> extends EventEmitter implements IDebugAgent<T> {
  connection?: mqtt.MqttClient

  client?: IClient<T>

  constructor(private readonly options: DebugAgentOptions) {
    super()
  }

  async connect(client: IClient<T>): Promise<void> {
    this.client = client
    const { brokerUrl, username, password } = this.options

    this.connection = mqtt.connect(brokerUrl || 'ws://127.0.0.1:58080', {
      username,
      password,
      clientId: this.client.clientId || generateUUID(),
    })

    const command = `command/${this.client.clientId}/#`
    const commandAll = `command/all/#`

    this.connection.on('connect', () => {
      this.push('debug_agent_connected', { uuid: generateUUID(), clientId: this.client!.clientId })
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
    })

    this.connection.on('message', (topic, message) => {
      try {
        console.log(`Received MQTT message on topic ${topic}:`, message.toString())
        const [fn, scope, command] = topic.split('/')
        if (fn === 'command' && (scope === this.client!.clientId || scope === 'all')) {
          const payload = JSON.parse(message.toString()) as ICommandPayload

          switch (command) {
            case 'client_info':
              this.report(payload.uuid, {
                address: client.options.transport.address,
                defaultUnitId: client.options.defaultUnitId,
                defaultTimeout: client.options.defaultTimeout,
                defaultInterval: client.options.defaultInterval,
                maxQueueSize: client.options.maxQueueSize,
              })
              break
            default:
              console.warn(`Unknown command received from DebugAgent: ${command}`)
          }
        }
      } catch (error) {
        console.error('Failed to parse MQTT message:', error)
      }
    })

    client.on('read-before', (o) => this.push('read-before', o))
    client.on('read', (r) => this.push('read', r))
    client.on('read-error', (error) => this.push('read-error', error))

    client.on('write-before', (o) => this.push('write-before', o))
    client.on('written', (r) => this.push('written', r))
    client.on('write-error', (error) => this.push('write-error', error))

    client.subscriptionEngine.on('subscribe-before', (o) => this.push('subscribe-before', o))
    client.subscriptionEngine.on('subscribed', (o) => this.push('subscribed', o))
    client.subscriptionEngine.on('subscription-error', (o) => this.push('subscription-error', o))

    client.subscriptionEngine.on('unsubscribe-before', (o) => this.push('unsubscribe-before', o))
    client.subscriptionEngine.on('unsubscribed', (o) => this.push('unsubscribed', o))
    client.subscriptionEngine.on('unsubscribe-error', (o) => this.push('unsubscribe-error', o))
  }

  /**
   * 主动推送调试信息到调试器
   */
  push(command: string, payload: object) {
    if (!this.client) {
      console.error('DebugAgent client is not set. Call connect() first.')
      return
    }

    // console.log(`DebugAgent push: ${command}`, payload)

    const topic = `report/${this.client.clientId}/${command}`

    if (!this.connection || !this.connection.connected) {
      return
    }

    this.connection.publish(topic, JSON.stringify(payload, replacer))
  }

  /**
   * 返回指令执行结果给调试器
   */
  report(uuid: string, payload: object) {
    if (!this.client) {
      console.error('DebugAgent client is not set. Call connect() first.')
      return
    }

    const topic = `report/${this.client.clientId}/${uuid}`

    if (!this.connection || !this.connection.connected) {
      return
    }

    this.connection.publish(topic, JSON.stringify(payload))
  }
}
