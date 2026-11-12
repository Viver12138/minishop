import React, { useEffect, useMemo, useState } from 'react'
import { Card, Row, Col, InputNumber, Button, Tag, Divider, Rate, message, Empty, Skeleton, List, Avatar, Space } from 'antd'
import { HeartOutlined, HeartFilled, ShoppingCartOutlined, ThunderboltOutlined } from '@ant-design/icons'
import { useParams, useNavigate } from 'react-router-dom'
import { productApi, cartApi, favoriteApi } from '../../api'
import { dataOf } from '../../api/client'
import { useAuth } from '../../store/auth'
import type { Product, Review } from '../../types'

interface SpecOptions {
  [name: string]: string[]
}

export default function ProductDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { user } = useAuth()
  const [product, setProduct] = useState<Product | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Record<string, string>>({})
  const [quantity, setQuantity] = useState(1)

  useEffect(() => {
    setLoading(true)
    productApi.detail(Number(id)).then((r) => {
      setProduct(dataOf(r))
    }).finally(() => setLoading(false))
    productApi.reviews(Number(id)).then((r) => setReviews(dataOf(r)?.items || [])).catch(() => {})
  }, [id])

  // 解析规格选项
  const specOptions = useMemo<SpecOptions>(() => {
    const opts: SpecOptions = {}
    product?.skus.forEach((s) => {
      Object.entries(s.spec_values).forEach(([k, v]) => {
        if (!opts[k]) opts[k] = []
        if (!opts[k].includes(v)) opts[k].push(v)
      })
    })
    return opts
  }, [product])

  // 根据已选规格找当前 SKU
  const currentSku = useMemo(() => {
    if (!product || Object.keys(selected).length === 0) return undefined
    return product.skus.find((s) => {
      return Object.entries(selected).every(([k, v]) => s.spec_values[k] === v)
    })
  }, [product, selected])

  const specName = Object.keys(specOptions)[0]
  const remainingSpecKeys = Object.keys(specOptions)

  const selectSpec = (name: string, value: string) => {
    setSelected((prev) => ({ ...prev, [name]: value }))
  }

  const currentStock = currentSku?.stock ?? 0
  const currentPrice = currentSku?.price ?? product?.price ?? 0

  const addToCart = async () => {
    if (!user) return nav('/login')
    if (!currentSku) { message.warning('请选择商品规格'); return }
    if (currentStock <= 0) { message.error('库存不足，无法购买'); return }
    await cartApi.add(currentSku.id, quantity)
    message.success('已加入购物车')
  }

  const buyNow = async () => {
    if (!user) return nav('/login')
    if (!currentSku) { message.warning('请选择商品规格'); return }
    if (currentStock < quantity) { message.error('库存不足'); return }
    // 直接加入购物车并跳转结算（简化，利用购物车合并逻辑）
    await cartApi.add(currentSku.id, quantity)
    nav('/cart')
  }

  const toggleFavorite = async () => {
    if (!user) return nav('/login')
    if (product?.is_favorite) {
      await favoriteApi.remove(product.id)
      setProduct({ ...product, is_favorite: false })
      message.success('已取消收藏')
    } else {
      await favoriteApi.add(product!.id)
      setProduct({ ...product!, is_favorite: true })
      message.success('已收藏')
    }
  }

  if (loading) return <Skeleton active />

  if (!product) return <Empty description="商品不存在或已下架" style={{ padding: 60 }} />

  return (
    <div>
      <Row gutter={24}>
        <Col span={10}>
          <Card>
            <img src={product.images[0] || ''} alt={product.name} style={{ width: '100%', borderRadius: 8 }} />
          </Card>
        </Col>
        <Col span={14}>
          <Card>
            <h2 style={{ marginTop: 0 }}>{product.name}</h2>
            <p className="text-muted">{product.description}</p>
            <div style={{ background: '#fff7e6', padding: 16, borderRadius: 8, margin: '8px 0' }}>
              <span style={{ fontSize: 14 }}>价格：</span>
              <span className="money" style={{ fontSize: 28 }}>￥{Number(currentPrice).toFixed(2)}</span>
              {product.original_price > product.price && (
                <span className="text-muted" style={{ textDecoration: 'line-through', marginLeft: 12 }}>￥{product.original_price}</span>
              )}
            </div>
            <div style={{ marginBottom: 12 }}>
              <Tag color="blue">已售 {product.sales}</Tag>
              {currentSku ? stockTag(currentStock) : (product.status === 'ON_SALE' ? <Tag color="green">有货</Tag> : <Tag color="red">已下架</Tag>)}
              {product.status !== 'ON_SALE' && <Tag color="red">已下架</Tag>}
            </div>

            {remainingSpecKeys.map((name) => (
              <div key={name} style={{ marginBottom: 16 }}>
                <div style={{ marginBottom: 8 }}>{name}：</div>
                {specOptions[name].map((v) => {
                  const skuForThis = product.skus.find((s) => s.spec_values[name] === v)
                  return (
                    <span
                      key={v}
                      className={'spec-tag ' + (selected[name] === v ? 'selected' : '') + (skuForThis && skuForThis.stock <= 0 ? ' disabled' : '')}
                      onClick={() => selectSpec(name, v)}
                    >
                      {v}
                    </span>
                  )
                })}
              </div>
            ))}

            <div style={{ marginBottom: 16 }}>
              <span style={{ marginRight: 12 }}>数量：</span>
              <InputNumber min={1} max={currentStock || 1} value={quantity} onChange={(v) => setQuantity(v || 1)} />
              {currentSku && <span className="text-muted" style={{ marginLeft: 12 }}>库存 {currentStock} 件</span>}
            </div>

            <Space size={16}>
              <Button type="primary" size="large" icon={<ShoppingCartOutlined />} onClick={addToCart} disabled={currentSku && currentStock <= 0}>
                加入购物车
              </Button>
              <Button danger size="large" icon={<ThunderboltOutlined />} onClick={buyNow} disabled={currentSku && currentStock < quantity}>
                立即购买
              </Button>
              <Button size="large" icon={product.is_favorite ? <HeartFilled /> : <HeartOutlined />} onClick={toggleFavorite}>
                {product.is_favorite ? '已收藏' : '收藏'}
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>

      <Card title="商品评价" style={{ marginTop: 16 }}>
        {reviews.length === 0 ? <Empty description="暂无评价" /> : (
          <List
            itemLayout="horizontal"
            dataSource={reviews}
            renderItem={(r) => (
              <List.Item>
                <List.Item.Meta
                  avatar={<Avatar>{r.nickname?.charAt(0) || 'U'}</Avatar>}
                  title={<span>{r.nickname} <Rate disabled value={r.rating} style={{ fontSize: 14, marginLeft: 8 }} /></span>}
                  description={<div><div>{r.content}</div><div className="text-muted" style={{ fontSize: 12 }}>{r.created_at}</div></div>}
                />
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  )
}

function stockTag(stock: number) {
  if (stock <= 0) return <Tag color="red">售罄</Tag>
  if (stock <= 5) return <Tag color="orange">库存紧张</Tag>
  return <Tag color="green">有货</Tag>
}