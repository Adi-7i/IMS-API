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
        cost_price_rupees: 250.0,
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

    it('rejects negative or zero price', () => {
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
        customer_email: 'anita@example.com',
        customer_phone: '9876543210',
        items: [
          { product_id: 1, quantity: 2, unit_price_rupees: 299 },
          { product_id: 2, quantity: 1, unit_price_rupees: 599 },
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
          quantity_change: 10,
          reason: 'Restock shipment',
        }).success,
      ).toBe(true)

      expect(
        stockAdjustmentSchema.safeParse({
          product_id: 1,
          quantity_change: -5,
          reason: 'Damaged items',
        }).success,
      ).toBe(true)
    })

    it('rejects zero adjustment', () => {
      const result = stockAdjustmentSchema.safeParse({
        product_id: 1,
        quantity_change: 0,
      })
      expect(result.success).toBe(false)
    })
  })
})
