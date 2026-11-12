import React, { useEffect, useState } from 'react'
import { Row, Col, Card, Tag, Select, InputNumber, Pagination, Space, Empty, Skeleton } from 'antd'
import { productApi } from '../../api'
import { dataOf } from '../../api/client'
import type { Product, Category } from '../../types'
import { Link, useSearchParams } from 'react-router-dom'

export default function ProductList() {
  const [params] = useSearchParams()
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const [keyword, setKeyword] = useState(params.get('keyword') || '')
  const [categoryId, setCategoryId] = useState<number | undefined>(params.get('category_id') ? Number(params.get('category_id')) : undefined)
  const [sort, setSort] = useState('default')
  const [minPrice, setMinPrice] = useState<number | undefined>()
  const [maxPrice, setMaxPrice] = useState<number | undefined>()
  const [page, setPage] = useState(1)
  const [applied, setApplied] = useState({})

  useEffect(() => { productApi.categories().then((r) => setCategories(dataOf(r))) }, [])

  useEffect(() => {
    setLoading(true)
    const p: any = { page, page_size: 12, sort }
    if (keyword) p.keyword = keyword
    if (categoryId) p.category_id = categoryId
    if (minPrice !== undefined) p.min_price = minPrice
    if (maxPrice !== undefined) p.max_price = maxPrice
    productApi.list(p).then((r) => {
      const d = dataOf(r)
      setProducts(d.items)
      setTotal(d.total)
    }).finally(() => setLoading(false))
  }, [page, sort, applied])

  const applyFilters = () => {
    setPage(1)
    setApplied({ ...applied, k: Date.now() })
  }

  const renderCard = (p: Product) => (
    <Link to={`/products/${p.id}`}>
      <Card hoverable cover={<img src={p.images[0] || ''} className="product-card-image" alt={p.name} />} style={{ marginBottom: 16 }}>
        <Card.Meta
          title={<span style={{ fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220, display: 'block' }}>{p.name}</span>}
          description={
            <div>
              <div className="money">￥{Number(p.price).toFixed(2)}</div>
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

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Select
            placeholder="全部分类"
            allowClear
            style={{ width: 150 }}
            value={categoryId}
            onChange={(v) => setCategoryId(v)}
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
          />
          <Select placeholder="排序" style={{ width: 120 }} value={sort} onChange={setSort}
            options={[
              { value: 'default', label: '综合排序' },
              { value: 'sales', label: '销量优先' },
              { value: 'price_asc', label: '价格升序' },
              { value: 'price_desc', label: '价格降序' },
            ]} />
          <InputNumber placeholder="最低价" style={{ width: 100 }} value={minPrice} onChange={(v) => setMinPrice(v ?? undefined)} min={0} />
          <span>-</span>
          <InputNumber placeholder="最高价" style={{ width: 100 }} value={maxPrice} onChange={(v) => setMaxPrice(v ?? undefined)} min={0} />
          <select hidden />
          <a href="#" onClick={(e) => { e.preventDefault(); applyFilters() }}>应用筛选</a>
          {keyword && <Tag closable onClose={() => { setKeyword(''); setTimeout(applyFilters, 0) }}>搜索：{keyword}</Tag>}
        </Space>
      </Card>

      {loading ? <Skeleton active /> : (
        products.length === 0 ? <Empty description="没有找到相关商品" style={{ padding: 60 }} /> : (
          <>
            <Row gutter={[16, 16]}>{products.map((p) => <Col span={6} key={p.id}>{renderCard(p)}</Col>)}</Row>
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <Pagination current={page} total={total} pageSize={12} onChange={setPage} showTotal={(t) => `共 ${t} 件`} />
            </div>
          </>
        )
      )}
    </div>
  )
}