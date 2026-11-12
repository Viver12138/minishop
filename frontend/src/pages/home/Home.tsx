import React, { useEffect, useState } from 'react'
import { Row, Col, Card, Tag, Input, Empty, Skeleton } from 'antd'
import { productApi } from '../../api'
import { dataOf } from '../../api/client'
import type { Product, Category } from '../../types'
import { Link } from 'react-router-dom'

export default function Home() {
  const [categories, setCategories] = useState<Category[]>([])
  const [hot, setHot] = useState<Product[]>([])
  const [newItems, setNewItems] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      productApi.categories().then((r) => dataOf(r)),
      productApi.list({ sort: 'sales', page: 1, page_size: 8 }).then((r) => dataOf(r)),
      productApi.list({ sort: 'default', page: 1, page_size: 8 }).then((r) => dataOf(r)),
    ]).then(([cats, hotR, newR]) => {
      setCategories(cats)
      setHot(hotR.items)
      setNewItems(newR.items)
    }).finally(() => setLoading(false))
  }, [])

  const renderCard = (p: Product) => (
    <Link to={`/products/${p.id}`}>
      <Card
        hoverable
        cover={<img src={p.images[0] || ''} className="product-card-image" alt={p.name} />}
        style={{ marginBottom: 16 }}
      >
        <Card.Meta
          title={<span style={{ fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 }}>{p.name}</span>}
          description={
            <div>
              <div className="money">￥{p.price.toFixed ? p.price.toFixed(2) : p.price}</div>
              {p.original_price > p.price && <span className="text-muted" style={{ textDecoration: 'line-through', fontSize: 12 }}>￥{p.original_price}</span>}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                <Tag color="blue">已售 {p.sales}</Tag>
                {p.stock > 0 ? <Tag color="green">有货</Tag> : <Tag color="red">售罄</Tag>}
              </div>
            </div>
          }
        />
      </Card>
    </Link>
  )

  if (loading) return <Skeleton active />

  return (
    <div>
      <div className="promo-banner">
        <div className="promo-title">MiniShop 综合电商平台</div>
        <div>精选好物 · 满减优惠 · 极速发货 —— 一个完整的电商业务闭环 Demo</div>
      </div>

      <Card title="商品分类" style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          {categories.map((c) => (
            <Col span={4} key={c.id}>
              <div className="category-card" onClick={() => (window.location.href = `/products?category_id=${c.id}`)}>
                <div style={{ fontSize: 28 }}>🛍️</div>
                <div>{c.name}</div>
              </div>
            </Col>
          ))}
        </Row>
      </Card>

      <Card title="🔥 热门商品" style={{ marginBottom: 16 }}>
        {hot.length === 0 ? <Empty /> : <Row gutter={[16, 16]}>{hot.map((p) => <Col span={6} key={p.id}>{renderCard(p)}</Col>)}</Row>}
      </Card>

      <Card title="✨ 最新上架">
        {newItems.length === 0 ? <Empty /> : <Row gutter={[16, 16]}>{newItems.map((p) => <Col span={6} key={p.id}>{renderCard(p)}</Col>)}</Row>}
      </Card>
    </div>
  )
}