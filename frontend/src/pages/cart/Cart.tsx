import React, { useEffect, useState } from 'react'
import { Card, Table, InputNumber, Button, Space, Checkbox, Popconfirm, message, Empty, Typography } from 'antd'
import { DeleteOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { cartApi } from '../../api'
import { dataOf } from '../../api/client'
import type { CartItem } from '../../types'

export default function Cart() {
  const nav = useNavigate()
  const [items, setItems] = useState<CartItem[]>([])
  const [selected, setSelected] = useState<number[]>([])
  const [loading, setLoading] = useState(false)

  const load = async () => {
    try {
      const r = await cartApi.list()
      setItems(dataOf(r).items)
      // 默认全选可用商品
      setSelected((prev) => {
        if (prev.length > 0) return prev
        return dataOf(r).items.filter((i: CartItem) => i.available).map((i: CartItem) => i.id)
      })
    } catch { /* 401 已处理 */ }
  }

  useEffect(() => { load() }, [])

  const reload = async () => { await load() }

  const updateQty = async (id: number, q: number) => {
    await cartApi.update(id, q)
    await reload()
  }

  const removeItem = async (id: number) => {
    await cartApi.remove(id)
    setSelected((s) => s.filter((x) => x !== id))
    await reload()
  }

  const selectedItems = items.filter((i) => selected.includes(i.id))
  const totalAmount = selectedItems.reduce((s, i) => s + i.subtotal, 0)

  const checkout = () => {
    if (selectedItems.length === 0) { message.warning('请先勾选商品'); return }
    // 将所选商品以 sku_id + quantity 传给订单确认页
    const payload = selectedItems.map((i) => ({ sku_id: i.sku_id, quantity: i.quantity }))
    sessionStorage.setItem('order_items', JSON.stringify(payload))
    nav('/orders/confirm')
  }

  const columns = [
    {
      title: '商品', dataIndex: 'product_name',
      render: (_: any, r: CartItem) => (
        <Space>
          <img src={r.product_image} className="cart-image" alt="" />
          <div>
            <div>{r.product_name}</div>
            <div className="text-muted" style={{ fontSize: 12 }}>
              {Object.entries(r.spec_values).map(([k, v]) => `${k}:${v}`).join(' | ')}
            </div>
            {!r.available && <Typography.Text type="danger" style={{ fontSize: 12 }}>库存不足或已下架</Typography.Text>}
          </div>
        </Space>
      ),
    },
    { title: '单价', render: (_: any, r: CartItem) => <span className="money">￥{Number(r.price).toFixed(2)}</span> },
    {
      title: '数量', dataIndex: 'quantity',
      render: (q: number, r: CartItem) => (
        <InputNumber
          min={1} max={Math.max(r.stock, 1)} value={q}
          disabled={!r.available}
          onChange={(v) => updateQty(r.id, v || 1)}
        />
      ),
    },
    { title: '小计', render: (_: any, r: CartItem) => <span className="money">￥{Number(r.subtotal).toFixed(2)}</span> },
    {
      title: '操作', render: (_: any, r: CartItem) => (
        <Popconfirm title="确定删除该商品？" onConfirm={() => removeItem(r.id)}>
          <Button type="text" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ]

  return (
    <Card title="购物车">
      {items.length === 0 ? <Empty description="购物车是空的" style={{ padding: 60 }}><Button type="primary" onClick={() => nav('/products')}>去逛逛</Button></Empty> : (
        <>
          <Table
            rowKey="id"
            columns={columns}
            dataSource={items}
            pagination={false}
            loading={loading}
            rowSelection={{
              selectedRowKeys: selected,
              onChange: (keys) => setSelected(keys as number[]),
              getCheckboxProps: (r: CartItem) => ({ disabled: !r.available }),
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: 16 }}>
            <div style={{ marginRight: 24 }}>
              已选 {selectedItems.length} 件商品，合计：
              <span className="money" style={{ fontSize: 24 }}>￥{Number(totalAmount).toFixed(2)}</span>
            </div>
            <Button type="primary" size="large" onClick={checkout}>去结算</Button>
          </div>
        </>
      )}
    </Card>
  )
}