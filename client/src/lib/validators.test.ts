import { describe, it, expect } from 'vitest'
import {
  createProductSchema,
  createOrderSchema,
  stockAdjustmentSchema,
} from './validators'

describe('Form Validators (Zod)', () => {
  describe('createProductSchema', () => {
    it('validates valid product payload', () => {
      const result = createProductSchema.safeParse({
        name: 'Cotton T-Shirt',
        sku: 'TSHIRT-001',
        category_id: 1,
        price_rupees: 499.0,
        stock_quantity: 50,
        low_stock_threshold: 10,
      })
      expect(result.success).toBe(true)
    })

    it('rejects missing name or invalid SKU characters', () => {
      const result = createProductSchema.safeParse({
        name: '',
        sku: 'INVALID SKU WITH SPACES!',
        category_id: 1,
        price_rupees: 499,
      })
      expect(result.success).toBe(false)
    })

    it('rejects negative price', () => {
      const result = createProductSchema.safeParse({
        name: 'Product A',
        sku: 'SKU-01',
        category_id: 1,
        price_rupees: -10,
      })
      expect(result.success).toBe(false)
    })
  })

  describe('createOrderSchema', () => {
    it('validates a correct multi-item order', () => {
      const result = createOrderSchema.safeParse({
        customer_name: 'Anita Roy',
        items: [
          { product_id: 1, quantity: 2 },
          { product_id: 2, quantity: 1 },
        ],
      })
      expect(result.success).toBe(true)
    })

    it('rejects an order with empty items list', () => {
      const result = createOrderSchema.safeParse({
        customer_name: 'Anita Roy',
        items: [],
      })
      expect(result.success).toBe(false)
    })
  })

  describe('stockAdjustmentSchema', () => {
    it('accepts positive and negative adjustments', () => {
      expect(
        stockAdjustmentSchema.safeParse({
          product_id: 1,
          delta: 10,
          reason: 'Restock shipment',
        }).success,
      ).toBe(true)

      expect(
        stockAdjustmentSchema.safeParse({
          product_id: 1,
          delta: -5,
          reason: 'Damaged items',
        }).success,
      ).toBe(true)
    })

    it('rejects zero adjustment', () => {
      const result = stockAdjustmentSchema.safeParse({
        product_id: 1,
        delta: 0,
      })
      expect(result.success).toBe(false)
    })
  })
})

 it('requires an audit reason and rejects duplicate products', () => {
  expect(stockAdjustmentSchema.safeParse({ product_id: 1, delta: 1, reason: ' ' }).success).toBe(false)
  expect(createOrderSchema.safeParse({ customer_name: 'Test', items: [{ product_id: 1, quantity: 1 }, { product_id: 1, quantity: 2 }] }).success).toBe(false)
 })
 it('accepts zero price supported by the backend, but rejects extra decimal places', () => {
  const product = { name: 'Test', sku: 'TEST', category_id: 1 }
  expect(createProductSchema.safeParse({ ...product, price_rupees: '0.00' }).success).toBe(true)
  expect(createProductSchema.safeParse({ ...product, price_rupees: '1.001' }).success).toBe(false)
 })
