import { describe, expect, it } from 'vitest'
import { ModbusTcpPacketFactory, ReadFn, WriteFn, type ReadOptions } from '../src/index'
import {
  type ReadCoilsOptions,
  type ReadDiscreteInputsOptions,
  type ReadHoldingRegistersOptions,
  type ReadInputRegistersOptions,
  type WriteCoilOptions,
  type WriteCoilsOptions,
  type WriteRegisterOptions,
  type WriteRegistersOptions,
} from '../src/type'
import { wrapMbapHeader } from '../src/encode'

describe('ModbusTcpPacketFactory', () => {
  const factory = new ModbusTcpPacketFactory()

  describe('encodeRead', () => {
    it('应该正确编码读取线圈指令', () => {
      const options: ReadCoilsOptions = {
        fn: ReadFn.ReadCoils,
        unitId: 1,
        start: 100,
        length: 10,
      }

      const result = factory.encodeRead(0, options)

      // MBAP 头 (7 字节) + PDU (5 字节) = 12 字节
      expect(result.length).toBe(12)

      // 检查 MBAP 头
      expect(result[0]).toBe(0x00) // 事务 ID 高字节
      expect(result[1]).toBe(0x00) // 事务 ID 低字节
      expect(result[2]).toBe(0x00) // 协议 ID 高字节
      expect(result[3]).toBe(0x00) // 协议 ID 低字节
      expect(result[4]).toBe(0x00) // 长度高字节
      expect(result[5]).toBe(0x06) // 长度低字节 (1 个从站ID + 5 个 PDU)
      expect(result[6]).toBe(0x01) // 从站 ID

      // 检查 PDU
      expect(result[7]).toBe(0x01) // 功能码: 读取线圈
      expect(result[8]).toBe(0x00) // 起始地址高字节
      expect(result[9]).toBe(0x64) // 起始地址低字节 (100)
      expect(result[10]).toBe(0x00) // 数量高字节
      expect(result[11]).toBe(0x0a) // 数量低字节 (10)
    })

    it('应该正确编码读取离散输入指令', () => {
      const options: ReadDiscreteInputsOptions = {
        fn: ReadFn.ReadDiscreteInputs,
        unitId: 1,
        start: 200,
        length: 8,
      }

      const result = factory.encodeRead(0, options)

      expect(result.length).toBe(12)
      expect(result[7]).toBe(0x02) // 功能码: 读取离散输入
      expect(result[8]).toBe(0x00) // 起始地址高字节
      expect(result[9]).toBe(0xc8) // 起始地址低字节 (200)
      expect(result[10]).toBe(0x00) // 数量高字节
      expect(result[11]).toBe(0x08) // 数量低字节 (8)
    })

    it('应该正确编码读取保持寄存器指令', () => {
      const options: ReadHoldingRegistersOptions = {
        fn: ReadFn.ReadHoldingRegisters,
        unitId: 1,
        start: 0,
        length: 16,
      }

      const result = factory.encodeRead(0, options)

      expect(result.length).toBe(12)
      expect(result[7]).toBe(0x03) // 功能码: 读取保持寄存器
      expect(result[8]).toBe(0x00) // 起始地址高字节
      expect(result[9]).toBe(0x00) // 起始地址低字节 (0)
      expect(result[10]).toBe(0x00) // 数量高字节
      expect(result[11]).toBe(0x10) // 数量低字节 (16)
    })

    it('应该正确编码读取输入寄存器指令', () => {
      const options: ReadInputRegistersOptions = {
        fn: ReadFn.ReadInputRegisters,
        unitId: 1,
        start: 1000,
        length: 5,
      }

      const result = factory.encodeRead(0, options)

      expect(result.length).toBe(12)
      expect(result[7]).toBe(0x04) // 功能码: 读取输入寄存器
      expect(result[8]).toBe(0x03) // 起始地址高字节
      expect(result[9]).toBe(0xe8) // 起始地址低字节 (1000)
      expect(result[10]).toBe(0x00) // 数量高字节
      expect(result[11]).toBe(0x05) // 数量低字节 (5)
    })

    it('应该处理最大起始地址', () => {
      const options: ReadHoldingRegistersOptions = {
        fn: ReadFn.ReadHoldingRegisters,
        unitId: 1,
        start: 65535,
        length: 1,
      }

      const result = factory.encodeRead(0, options)

      expect(result[8]).toBe(0xff) // 起始地址高字节
      expect(result[9]).toBe(0xff) // 起始地址低字节 (65535)
    })

    it('应该处理最大长度', () => {
      const options: ReadHoldingRegistersOptions = {
        fn: ReadFn.ReadHoldingRegisters,
        unitId: 1,
        start: 0,
        length: 65535,
      }

      const result = factory.encodeRead(0, options)

      expect(result[10]).toBe(0xff) // 数量高字节
      expect(result[11]).toBe(0xff) // 数量低字节 (65535)
    })
  })

  describe('encodeWrite', () => {
    describe('WriteSingleCoil', () => {
      it('应该正确编码单个线圈 ON', () => {
        const options: WriteCoilOptions = {
          fn: WriteFn.WriteSingleCoil,
          unitId: 1,
          start: 100,
          value: true,
        }

        const result = factory.encodeWrite(0, options)

        expect(result.length).toBe(12)
        expect(result[7]).toBe(0x05) // 功能码: 写单个线圈
        expect(result[8]).toBe(0x00) // 起始地址高字节
        expect(result[9]).toBe(0x64) // 起始地址低字节 (100)
        expect(result[10]).toBe(0xff) // 值高字节 (0xFF00 = ON)
        expect(result[11]).toBe(0x00) // 值低字节
      })

      it('应该正确编码单个线圈 OFF', () => {
        const options: WriteCoilOptions = {
          fn: WriteFn.WriteSingleCoil,
          unitId: 1,
          start: 200,
          value: false,
        }

        const result = factory.encodeWrite(0, options)

        expect(result.length).toBe(12)
        expect(result[7]).toBe(0x05) // 功能码: 写单个线圈
        expect(result[8]).toBe(0x00) // 起始地址高字节
        expect(result[9]).toBe(0xc8) // 起始地址低字节 (200)
        expect(result[10]).toBe(0x00) // 值高字节 (0x0000 = OFF)
        expect(result[11]).toBe(0x00) // 值低字节
      })

      it('应该编码单个线圈的数值 1 为 ON', () => {
        const options: WriteCoilOptions = {
          fn: WriteFn.WriteSingleCoil,
          unitId: 1,
          start: 0,
          value: 1,
        }

        const result = factory.encodeWrite(0, options)

        expect(result[10]).toBe(0xff) // 值高字节 (ON)
        expect(result[11]).toBe(0x00) // 值低字节
      })

      it('应该编码单个线圈的数值 0 为 OFF', () => {
        const options: WriteCoilOptions = {
          fn: WriteFn.WriteSingleCoil,
          unitId: 1,
          start: 0,
          value: 0,
        }

        const result = factory.encodeWrite(0, options)

        expect(result[10]).toBe(0x00) // 值高字节 (OFF)
        expect(result[11]).toBe(0x00) // 值低字节
      })
    })

    describe('WriteSingleRegister', () => {
      it('应该正确编码单个寄存器', () => {
        const options: WriteRegisterOptions = {
          fn: WriteFn.WriteSingleRegister,
          unitId: 1,
          start: 10,
          value: 1234,
        }

        const result = factory.encodeWrite(0, options)

        expect(result.length).toBe(12)
        expect(result[7]).toBe(0x06) // 功能码: 写单个寄存器
        expect(result[8]).toBe(0x00) // 起始地址高字节
        expect(result[9]).toBe(0x0a) // 起始地址低字节 (10)
        expect(result[10]).toBe(0x04) // 值高字节 (1234 = 0x04D2)
        expect(result[11]).toBe(0xd2) // 值低字节
      })

      it('应该编码单个寄存器的值 0', () => {
        const options: WriteRegisterOptions = {
          fn: WriteFn.WriteSingleRegister,
          unitId: 1,
          start: 0,
          value: 0,
        }

        const result = factory.encodeWrite(0, options)

        expect(result[10]).toBe(0x00) // 值高字节
        expect(result[11]).toBe(0x00) // 值低字节
      })

      it('应该编码单个寄存器的最大值', () => {
        const options: WriteRegisterOptions = {
          fn: WriteFn.WriteSingleRegister,
          unitId: 1,
          start: 0,
          value: 65535,
        }

        const result = factory.encodeWrite(0, options)

        expect(result[10]).toBe(0xff) // 值高字节
        expect(result[11]).toBe(0xff) // 值低字节
      })
    })

    describe('WriteMultipleCoils', () => {
      it('应该正确编码多个线圈', () => {
        const options: WriteCoilsOptions = {
          fn: WriteFn.WriteMultipleCoils,
          unitId: 1,
          start: 0,
          value: [true, false, true, false, true],
        }

        const result = factory.encodeWrite(0, options)

        // MBAP (7) + PDU: func(1) + addr(2) + qty(2) + byteCount(1) + data(1) = 14
        expect(result.length).toBe(14)
        expect(result[7]).toBe(0x0f) // 功能码: 写多个线圈
        expect(result[8]).toBe(0x00) // 起始地址高字节
        expect(result[9]).toBe(0x00) // 起始地址低字节
        expect(result[10]).toBe(0x00) // 数量高字节
        expect(result[11]).toBe(0x05) // 数量低字节 (5 个线圈)
        expect(result[12]).toBe(0x01) // 字节计数
        // 位模式: 10101xxx = 0x15
        expect(result[13]).toBe(0x15)
      })

      it('应该编码跨越多个字节的多个线圈', () => {
        const options: WriteCoilsOptions = {
          fn: WriteFn.WriteMultipleCoils,
          unitId: 1,
          start: 0,
          value: [true, true, true, true, true, true, true, true, false],
        }

        const result = factory.encodeWrite(0, options)

        // 9 个线圈 = 2 个字节
        expect(result.length).toBe(15)
        expect(result[12]).toBe(0x02) // 字节计数
        expect(result[13]).toBe(0xff) // 第一个字节: 所有 8 位都设置
        expect(result[14]).toBe(0x00) // 第二个字节: 只有第一个位
      })

      it('应该编码空的线圈数组', () => {
        const options: WriteCoilsOptions = {
          fn: WriteFn.WriteMultipleCoils,
          unitId: 1,
          start: 0,
          value: [],
        }

        const result = factory.encodeWrite(0, options)

        expect(result.length).toBe(13)
        expect(result[10]).toBe(0x00) // 数量低字节
        expect(result[12]).toBe(0x00) // 字节计数
      })

      it('应该编码数值型的线圈', () => {
        const options: WriteCoilsOptions = {
          fn: WriteFn.WriteMultipleCoils,
          unitId: 1,
          start: 0,
          value: [1, 0, 1],
        }

        const result = factory.encodeWrite(0, options)

        expect(result[13]).toBe(0x05) // 位模式: 101 = 0x05
      })
    })

    describe('WriteMultipleRegisters', () => {
      it('应该正确编码多个寄存器', () => {
        const options: WriteRegistersOptions = {
          fn: WriteFn.WriteMultipleRegisters,
          unitId: 1,
          start: 20,
          value: [100, 200, 300],
        }

        const result = factory.encodeWrite(0, options)

        // MBAP (7) + PDU: func(1) + addr(2) + qty(2) + byteCount(1) + data(6) = 19
        expect(result.length).toBe(19)
        expect(result[7]).toBe(0x10) // 功能码: 写多个寄存器
        expect(result[8]).toBe(0x00) // 起始地址高字节
        expect(result[9]).toBe(0x14) // 起始地址低字节 (20)
        expect(result[10]).toBe(0x00) // 数量高字节
        expect(result[11]).toBe(0x03) // 数量低字节 (3 个寄存器)
        expect(result[12]).toBe(0x06) // 字节计数 (3 * 2)

        // 寄存器值
        expect(result[13]).toBe(0x00) // 100 高字节
        expect(result[14]).toBe(0x64) // 100 低字节
        expect(result[15]).toBe(0x00) // 200 高字节
        expect(result[16]).toBe(0xc8) // 200 低字节
        expect(result[17]).toBe(0x01) // 300 高字节
        expect(result[18]).toBe(0x2c) // 300 低字节
      })

      it('应该编码单个寄存器的多个写入', () => {
        const options: WriteRegistersOptions = {
          fn: WriteFn.WriteMultipleRegisters,
          unitId: 1,
          start: 0,
          value: [65535],
        }

        const result = factory.encodeWrite(0, options)

        expect(result.length).toBe(15)
        expect(result[11]).toBe(0x01) // 数量低字节
        expect(result[12]).toBe(0x02) // 字节计数
        expect(result[13]).toBe(0xff) // 值高字节
        expect(result[14]).toBe(0xff) // 值低字节
      })

      it('应该编码零值寄存器', () => {
        const options: WriteRegistersOptions = {
          fn: WriteFn.WriteMultipleRegisters,
          unitId: 1,
          start: 0,
          value: [0, 0, 0],
        }

        const result = factory.encodeWrite(0, options)

        expect(result[13]).toBe(0x00)
        expect(result[14]).toBe(0x00)
        expect(result[15]).toBe(0x00)
        expect(result[16]).toBe(0x00)
        expect(result[17]).toBe(0x00)
        expect(result[18]).toBe(0x00)
      })
    })
  })

  describe('wrapMbapHeader', () => {
    it('应该用自定义事务 ID 包装 PDU', () => {
      const pdu = new Uint8Array([0x03, 0x00, 0x00, 0x00, 0x0a])
      const result = wrapMbapHeader(pdu, 1234, 2)

      expect(result[0]).toBe(0x04) // 事务 ID 高字节 (1234 = 0x04D2)
      expect(result[1]).toBe(0xd2) // 事务 ID 低字节
      expect(result[6]).toBe(0x02) // 从站 ID
    })

    it('应该使用默认事务 ID 和从站 ID', () => {
      const pdu = new Uint8Array([0x03, 0x00, 0x00, 0x00, 0x0a])
      const result = wrapMbapHeader(pdu)

      expect(result[0]).toBe(0x00) // 事务 ID 高字节 (默认 0)
      expect(result[1]).toBe(0x00) // 事务 ID 低字节
      expect(result[6]).toBe(0x01) // 从站 ID (默认 1)
    })
  })

  describe('mergeRead', () => {
    it('应该返回空数组以空输入', () => {
      const result = factory.mergeRead([])
      expect(result).toEqual([])
    })

    it('应该合并重叠区间', () => {
      const options: ReadHoldingRegistersOptions[] = [
        { fn: ReadFn.ReadHoldingRegisters, unitId: 1, start: 0, length: 10 },
        { fn: ReadFn.ReadHoldingRegisters, unitId: 1, start: 5, length: 10 },
      ]

      const result = factory.mergeRead(options)

      expect(result.length).toBe(1)
      expect(result[0].start).toBe(0)
      expect(result[0].length).toBe(15) // 0-14 覆盖两个范围
    })

    it('应该合并相邻区间', () => {
      const options: ReadHoldingRegistersOptions[] = [
        { fn: ReadFn.ReadHoldingRegisters, unitId: 1, start: 0, length: 10 },
        { fn: ReadFn.ReadHoldingRegisters, unitId: 1, start: 10, length: 10 },
      ]

      const result = factory.mergeRead(options)

      expect(result.length).toBe(1)
      expect(result[0].start).toBe(0)
      expect(result[0].length).toBe(20) // 0-19 覆盖两个范围
    })

    it('不应该合并非重叠区间', () => {
      const options: ReadHoldingRegistersOptions[] = [
        { fn: ReadFn.ReadHoldingRegisters, unitId: 1, start: 0, length: 5 },
        { fn: ReadFn.ReadHoldingRegisters, unitId: 1, start: 10, length: 5 },
      ]

      const result = factory.mergeRead(options)

      expect(result.length).toBe(2)
      expect(result[0].start).toBe(0)
      expect(result[0].length).toBe(5)
      expect(result[1].start).toBe(10)
      expect(result[1].length).toBe(5)
    })

    it('应该合并多个重叠区间', () => {
      const options: ReadHoldingRegistersOptions[] = [
        { fn: ReadFn.ReadHoldingRegisters, unitId: 1, start: 0, length: 10 },
        { fn: ReadFn.ReadHoldingRegisters, unitId: 1, start: 5, length: 10 },
        { fn: ReadFn.ReadHoldingRegisters, unitId: 1, start: 12, length: 8 },
      ]

      const result = factory.mergeRead(options)

      expect(result.length).toBe(1)
      expect(result[0].start).toBe(0)
      expect(result[0].length).toBe(20) // 0-19 覆盖所有范围
    })

    it('应该处理部分重叠区间', () => {
      const options: ReadHoldingRegistersOptions[] = [
        { fn: ReadFn.ReadHoldingRegisters, unitId: 1, start: 0, length: 10 },
        { fn: ReadFn.ReadHoldingRegisters, unitId: 1, start: 8, length: 5 },
        { fn: ReadFn.ReadHoldingRegisters, unitId: 1, start: 15, length: 5 },
      ]

      const result = factory.mergeRead(options)

      expect(result.length).toBe(2)
      expect(result[0].start).toBe(0)
      expect(result[0].length).toBe(13) // 0-12 (合并前两个)
      expect(result[1].start).toBe(15)
      expect(result[1].length).toBe(5) // 15-19 (单独)
    })

    it('应该按读取类型分组', () => {
      const options: ReadOptions[] = [
        { fn: ReadFn.ReadHoldingRegisters, unitId: 1, start: 0, length: 10 },
        { fn: ReadFn.ReadHoldingRegisters, unitId: 1, start: 5, length: 10 },
        { fn: ReadFn.ReadCoils, unitId: 1, start: 0, length: 10 },
        { fn: ReadFn.ReadCoils, unitId: 1, start: 5, length: 10 },
      ]

      const result = factory.mergeRead(options)

      expect(result.length).toBe(2)

      // 找到保持寄存器结果
      const holdingResult = result.find((r) => r.fn === ReadFn.ReadHoldingRegisters)
      expect(holdingResult).toBeDefined()
      expect(holdingResult!.start).toBe(0)
      expect(holdingResult!.length).toBe(15)

      // 找到线圈结果
      const coilResult = result.find((r) => r.fn === ReadFn.ReadCoils)
      expect(coilResult).toBeDefined()
      expect(coilResult!.start).toBe(0)
      expect(coilResult!.length).toBe(15)
    })

    it('应该处理单个选项', () => {
      const options: ReadHoldingRegistersOptions[] = [
        { fn: ReadFn.ReadHoldingRegisters, unitId: 1, start: 100, length: 5 },
      ]

      const result = factory.mergeRead(options)

      expect(result.length).toBe(1)
      expect(result[0].start).toBe(100)
      expect(result[0].length).toBe(5)
    })

    it('应该处理未排序输入', () => {
      const options: ReadHoldingRegistersOptions[] = [
        { fn: ReadFn.ReadHoldingRegisters, unitId: 1, start: 20, length: 5 },
        { fn: ReadFn.ReadHoldingRegisters, unitId: 1, start: 0, length: 10 },
        { fn: ReadFn.ReadHoldingRegisters, unitId: 1, start: 8, length: 15 }, // 从 5 改为 8 以使其与 20 重叠
      ]

      const result = factory.mergeRead(options)

      expect(result.length).toBe(1)
      expect(result[0].start).toBe(0)
      expect(result[0].length).toBe(25) // 0-24 覆盖所有范围 (0-9, 8-22, 20-24)
    })

    it('应该合并当一个区间包含另一个区间', () => {
      const options: ReadHoldingRegistersOptions[] = [
        { fn: ReadFn.ReadHoldingRegisters, unitId: 1, start: 0, length: 20 },
        { fn: ReadFn.ReadHoldingRegisters, unitId: 1, start: 5, length: 5 },
      ]

      const result = factory.mergeRead(options)

      expect(result.length).toBe(1)
      expect(result[0].start).toBe(0)
      expect(result[0].length).toBe(20) // 较大的区间应被保留
    })

    it('应该按不同的读取类型分别处理', () => {
      const options: ReadOptions[] = [
        { fn: ReadFn.ReadHoldingRegisters, unitId: 1, start: 0, length: 10 },
        { fn: ReadFn.ReadInputRegisters, unitId: 1, start: 0, length: 10 },
        { fn: ReadFn.ReadCoils, unitId: 1, start: 0, length: 10 },
        { fn: ReadFn.ReadDiscreteInputs, unitId: 1, start: 0, length: 10 },
      ]

      const result = factory.mergeRead(options)

      expect(result.length).toBe(4) // 所有不同类型的读取，不合并
      expect(result.every((r) => r.length === 10)).toBe(true)
    })

    it('应该按 unitId 分组', () => {
      const options: ReadHoldingRegistersOptions[] = [
        { fn: ReadFn.ReadHoldingRegisters, start: 0, length: 10, unitId: 1 },
        { fn: ReadFn.ReadHoldingRegisters, start: 5, length: 10, unitId: 1 },
        { fn: ReadFn.ReadHoldingRegisters, start: 0, length: 10, unitId: 2 },
        { fn: ReadFn.ReadHoldingRegisters, start: 5, length: 10, unitId: 2 },
      ]

      const result = factory.mergeRead(options)

      expect(result.length).toBe(2) // 两个不同的 unitIds

      // 找到 unitId 1 的结果
      const unit1Result = result.find((r) => r.unitId === 1)
      expect(unit1Result).toBeDefined()
      expect(unit1Result!.start).toBe(0)
      expect(unit1Result!.length).toBe(15) // unitId 1 的合并结果

      // 找到 unitId 2 的结果
      const unit2Result = result.find((r) => r.unitId === 2)
      expect(unit2Result).toBeDefined()
      expect(unit2Result!.start).toBe(0)
      expect(unit2Result!.length).toBe(15) // unitId 2 的合并结果
    })

    it('不应该合并不同 unitIds 的区间', () => {
      const options: ReadHoldingRegistersOptions[] = [
        { fn: ReadFn.ReadHoldingRegisters, start: 0, length: 10, unitId: 1 },
        { fn: ReadFn.ReadHoldingRegisters, start: 0, length: 10, unitId: 2 },
      ]

      const result = factory.mergeRead(options)

      expect(result.length).toBe(2) // 不同的 unitIds 不应合并
      expect(result[0].unitId).toBe(1)
      expect(result[1].unitId).toBe(2)
    })

    it('应该在未指定时使用默认 unitId', () => {
      const options: ReadHoldingRegistersOptions[] = [
        { fn: ReadFn.ReadHoldingRegisters, unitId: 1, start: 0, length: 10 }, // 未指定 unitId，默认为 1
        { fn: ReadFn.ReadHoldingRegisters, unitId: 1, start: 5, length: 10 }, // 未指定 unitId，默认为 1
      ]

      const result = factory.mergeRead(options)

      expect(result.length).toBe(1) // 应该合并，因为两者都有默认 unitId 1
      expect(result[0].start).toBe(0)
      expect(result[0].length).toBe(15)
    })

    it('应该处理混合 unitId 场景', () => {
      const options: ReadOptions[] = [
        // 从站 1, 保持寄存器
        { fn: ReadFn.ReadHoldingRegisters, start: 0, length: 10, unitId: 1 },
        { fn: ReadFn.ReadHoldingRegisters, start: 8, length: 5, unitId: 1 },
        // 从站 2, 保持寄存器
        { fn: ReadFn.ReadHoldingRegisters, start: 0, length: 10, unitId: 2 },
        // 从站 1, 线圈
        { fn: ReadFn.ReadCoils, start: 0, length: 10, unitId: 1 },
      ]

      const result = factory.mergeRead(options)

      expect(result.length).toBe(3)

      // 从站 1, 保持寄存器 (已合并)
      const unit1Holding = result.find(
        (r) => r.unitId === 1 && r.fn === ReadFn.ReadHoldingRegisters,
      )
      expect(unit1Holding).toBeDefined()
      expect(unit1Holding!.length).toBe(13) // 0-12

      // 从站 2, 保持寄存器 (不与从站 1 合并)
      const unit2Holding = result.find(
        (r) => r.unitId === 2 && r.fn === ReadFn.ReadHoldingRegisters,
      )
      expect(unit2Holding).toBeDefined()
      expect(unit2Holding!.length).toBe(10)

      // 从站 1, 线圈 (不同类型)
      const unit1Coils = result.find((r) => r.unitId === 1 && r.fn === ReadFn.ReadCoils)
      expect(unit1Coils).toBeDefined()
      expect(unit1Coils!.length).toBe(10)
    })
  })

  describe('decodeResponse', () => {
    it('应该正确解码带有事务 ID 的响应', () => {
      const data = new Uint8Array([0x00, 0x01, 0x00, 0x00, 0x00, 0x03, 0x01, 0x03, 0x02])
      const result = factory.decodeResponse(
        { fn: ReadFn.ReadHoldingRegisters, unitId: 1, start: 0, length: 1 },
        data,
      )

      expect(result.transactionId).toBe(0)
    })
  })

  describe('Edge cases', () => {
    it('应该正确处理大起始地址', () => {
      const options: ReadHoldingRegistersOptions = {
        fn: ReadFn.ReadHoldingRegisters,
        unitId: 1,
        start: 49152, // 0xC000
        length: 1,
      }

      const result = factory.encodeRead(0, options)

      expect(result[8]).toBe(0xc0) // 起始地址高字节
      expect(result[9]).toBe(0x00) // 起始地址低字节
    })

    it('应该保留多字节值的字节顺序', () => {
      const options: WriteRegisterOptions = {
        fn: WriteFn.WriteSingleRegister,
        unitId: 1,
        start: 0,
        value: 0x1234,
      }

      const result = factory.encodeWrite(0, options)

      expect(result[10]).toBe(0x12) // 高字节在前
      expect(result[11]).toBe(0x34) // 低字节在后
    })
  })
})
