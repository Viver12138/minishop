import React, { useEffect, useState } from 'react'
import { Card, Radio, List, Button, Space, Steps, message, Empty, Descriptions, Modal } from 'antd'
import { useNavigate, Link } from 'react-router-dom'
import { orderApi, addressApi, couponApi, productApi } from '../../api'
import { dataOf } from '../../api/client'
import type { Address, UserCoupon } from '../../types'

export default function OrderConfirm() {
  const nav = useNavigate()
  const [orderItems, setOrderItems] = useState<any[]>([])
  const [addresses, setAddresses] = useState<Address[]>([])
  const [coupons, setCoupons] = useState<UserCoupon[]>([])
  const [addressId, setAddressId] = useState<number>()
  const [couponId, setCouponId] = useState<number>()
  const [preview, setPreview] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    // 从购物车带来的商品（sku_id + quantity）
    const stored = sessionStorage.getItem('order_items')
    if (stored) {
      setOrderItems(JSON.parse(stored))
    }
    addressApi.list().then((r) => {
      const list = dataOf(r)
      setAddresses(list)
      const def = list.find((a: Address) => a.is_default)
      setAddressId(def?.id || list[0]?.id)
    })
    couponApi.my().then((r) => {
      const cs = dataOf<any>(r).filter((c: any) => c.status === 'UNUSED')
      setCoupons(cs)
    })
  }, [])

  useEffect(() => {
    if (orderItems.length > 0 && addressId) {
      orderApi.preview({
        items: orderItems,
        address_id: addressId,
        user_coupon_id: couponId || null,
      }).then((r) => setPreview(dataOf(r))).catch(() => setPreview(null))
    }
  }, [orderItems, addressId, couponId])

  const submit = async () => {
    if (!addressId) { message.warning('请选择收货地址'); return }
    setSubmitting(true)
    try {
      const r = await orderApi.create({
        items: orderItems,
        address_id: addressId,
        user_coupon_id: couponId || null,
        payment_method: 'WECHAT',
      })
      const order = dataOf(r)
      sessionStorage.removeItem('order_items')
      message.success('下单成功，请支付')
      nav(`/payment/${order.id}`)
    } catch { /* 已提示 */ } finally { setSubmitting(false) }
  }

  if (orderItems.length === 0 && !preview) {
    return <Empty description="没有待结算的商品" style={{ padding: 60 }}><Button onClick={() => nav('/cart')}>返回购物车</Button></Empty>
  }

  return (
    <div>
      <Steps
        current={0}
        items={[{ title: '确认订单' }, { title: '模拟支付' }, { title: '完成' }]}
        style={{ marginBottom: 24, maxWidth: 600 }}
      />

      <Card title="收货地址" style={{ marginBottom: 16 }}>
        {addresses.length === 0 ? (
          <Empty description="暂无收货地址"><Link to="/user/addresses"><Button type="primary">去添加地址</Button></Link></Empty>
        ) : (
          <Radio.Group value={addressId} onChange={(e) => setAddressId(e.target.value)}>
            <List
              grid={{ gutter: 16, column: 3 }}
              dataSource={addresses}
              renderItem={(a) => (
                <List.Item>
                  <Radio value={a.id}>
                    <Card size="small">
                      <div>{a.receiver_name} <span className="text-muted">{a.phone}</span></div>
                      <div>{a.full_address}</div>
                      {a.is_default && <div className="text-muted" style={{ fontSize: 12 }}>默认地址</div>}
                    </Card>
                  </Radio>
                </List.Item>
              )}
            />
          </Radio.Group>
        )}
      </Card>

      <Card title="商品清单" style={{ marginBottom: 16 }}>
        {preview?.items?.map((it: any) => (
          <div key={it.sku_id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
            <div>
              <div>{it.name}</div>
              <div className="text-muted" style={{ fontSize: 12 }}>
                {Object.entries(it.spec_values || {}).map(([k, v]) => `${k}:${v}`).join(' | ')}
              </div>
            </div>
            <div>
              ￥{it.price} × {it.quantity} = <span className="money">￥{it.subtotal}</span>
            </div>
          </div>
        ))}
      </Card>

      <Card title="优惠券" style={{ marginBottom: 16 }}>
        <Radio.Group value={couponId} onChange={(e) => setCouponId(e.target.value)}>
          <Space wrap>
            <Radio value={undefined}>不使用</Radio>
            {coupons.map((c) => (
              <Radio value={c.id} key={c.id}>
                满{c.threshold}减{c.discount_amount} - {c.name}
              </Radio>
            ))}
          </Space>
        </Radio.Group>
        {coupons.length === 0 && <div className="text-muted">暂无可用优惠券，<Link to="/user/coupons">去领取</Link></div>}
      </Card>

      <Card style={{ textAlign: 'right' }}>
        <Descriptions column={1} style={{ justifyContent: 'flex-end' }} bordered size="small" items={[
          { key: 't', label: '商品金额', children: <span>￥{preview?.total_amount ?? 0}</span> },
          { key: 'd', label: '优惠金额', children: <span style={{ color: '#52c41a' }}>-￥{preview?.discount_amount ?? 0}</span> },
          { key: 'p', label: '应付金额', children: <span className="money" style={{ fontSize: 22 }}>￥{preview?.pay_amount ?? 0}</span> },
        ]} />
        <div style={{ marginTop: 16 }}>
          <Button onClick={() => nav('/cart')} style={{ marginRight: 12 }}>返回购物车</Button>
          <Button type="primary" size="large" loading={submitting} onClick={submit}>提交订单</Button>
        </div>
      </Card>
    </div>
  )
}