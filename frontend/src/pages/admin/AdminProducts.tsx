import React, { useEffect, useState } from 'react'
import { Card, Table, Tag, Input, Select, Button, Space, Modal, Form, InputNumber, message, Popconfirm, Divider } from 'antd'
import { SearchOutlined, PlusOutlined } from '@ant-design/icons'
import { adminApi, productApi } from '../../api'
import { dataOf } from '../../api/client'
import type { Category } from '../../types'

export default function AdminProducts() {
  const [categories, setCategories] = useState<Category[]>([])
  const [list, setList] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState<string>()
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [skus, setSkus] = useState<any[]>([{ sku_code: '', spec_values: {}, price: 0, stock: 0 }])
  const [form] = Form.useForm()

  const load = () => {
    adminApi.products({ page, page_size: 10, keyword }).then((r) => {
      const d = dataOf(r)
      setList(d.items)
      setTotal(d.total)
    })
  }
  useEffect(() => { productApi.categories().then((r) => setCategories(dataOf(r))) }, [])
  useEffect(load, [page, keyword])

  const openCreate = () => {
    setEditing(null)
    setSkus([{ sku_code: '', spec_values: {}, price: 0, stock: 0 }])
    form.resetFields()
    setEditOpen(true)
  }

  const openEdit = (p: any) => {
    setEditing(p)
    form.setFieldsValue({ category_id: p.category_id, name: p.name, description: p.description, price: p.price, original_price: p.original_price })
    setSkus(p.skus && p.skus.length > 0 ? p.skus.map((s: any) => ({ id: s.id, sku_code: s.sku_code, spec_values: s.spec_values || {}, price: s.price, stock: s.stock })) : [{ sku_code: '', spec_values: { 默认: '默认' }, price: p.price, stock: p.stock }])
    setEditOpen(true)
  }

  const submit = async () => {
    const v = await form.validateFields()
    // 把 skus 的 spec_values (对象) + 展示字段规整为后端格式
    const payload = {
      category_id: v.category_id,
      name: v.name,
      description: v.description,
      price: v.price,
      original_price: v.original_price || v.price,
      images: [],
      skus: skus.map((s) => ({ sku_code: s.sku_code, spec_values: s.spec_values || {}, price: s.price ?? v.price, stock: s.stock ?? 0 })),
    }
    if (editing) {
      await adminApi.productUpdate(editing.id, payload)
      message.success('商品已更新')
    } else {
      await adminApi.productCreate(payload)
      message.success('商品已创建')
    }
    setEditOpen(false)
    load()
  }

  const onSkuChange = (idx: number, field: string, value: any) => {
    setSkus((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)))
  }

  // 简单规格编辑：逗号分词 form
  const [specTexts, setSpecTexts] = useState<Record<number, string>>({})
  const specPlain = (idx: number) => {
    return Object.entries(skus[idx]?.spec_values || {}).map(([k, v]) => `${k}:${v}`).join('，')
  }

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '图片', render: (_: any, r: any) => <img src={r.images?.[0]} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 4 }} /> },
    { title: '商品名', dataIndex: 'name' },
    { title: '价格', dataIndex: 'price', render: (v: number) => <span className="money">￥{v}</span> },
    { title: '库存', dataIndex: 'stock', render: (v: number) => <Tag color={v <= 0 ? 'red' : v <= 5 ? 'orange' : 'green'}>{v}</Tag> },
    { title: '销量', dataIndex: 'sales' },
    { title: 'SKU数', render: (_: any, r: any) => r.skus?.length || 0 },
    {
      title: '状态', dataIndex: 'status', render: (v: string, r: any) => (
        <Button size="small" type="text" onClick={() => toggleStatus(r)}>{v === 'ON_SALE' ? <Tag color="green">已上架</Tag> : <Tag color="red">已下架</Tag>}</Button>
      ),
    },
    {
      title: '操作', render: (_: any, r: any) => (
        <Space>
          <Button size="small" onClick={() => openEdit(r)}>编辑</Button>
          <Popconfirm title="确认删除？" onConfirm={async () => { await adminApi.productDelete(r.id); load() }}>
            <Button size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const toggleStatus = async (r: any) => {
    if (r.status === 'ON_SALE') await adminApi.productUnpublish(r.id)
    else await adminApi.productPublish(r.id)
    load()
  }

  return (
    <Card title="商品管理" extra={<Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新增商品</Button>}>
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Input placeholder="按商品名搜索" prefix={<SearchOutlined />} onChange={(e) => setKeyword(e.target.value || undefined)} onPressEnter={() => { setPage(1); load() }} style={{ width: 220 }} />
          <Button type="primary" onClick={() => { setPage(1); load() }}>查询</Button>
        </Space>
      </div>
      <Table rowKey="id" columns={columns} dataSource={list} pagination={{ current: page, total, pageSize: 10, onChange: setPage }} />

      <Modal title={editing ? '编辑商品' : '新增商品'} open={editOpen} onCancel={() => setEditOpen(false)} onOk={submit} width={720}>
        <Form form={form} layout="vertical">
          <Form.Item name="category_id" label="分类" rules={[{ required: true }]}>
            <Select options={categories.map((c) => ({ value: c.id, label: c.name }))} />
          </Form.Item>
          <Form.Item name="name" label="商品名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="description" label="商品描述"><Input.TextArea rows={2} /></Form.Item>
          <Space>
            <Form.Item name="price" label="售价" rules={[{ required: true }]}><InputNumber min={0} /></Form.Item>
            <Form.Item name="original_price" label="原价"><InputNumber min={0} /></Form.Item>
            <Form.Item name="stock" label="主库存（无SKU时使用）"><InputNumber min={0} /></Form.Item>
          </Space>
        </Form>
        <Divider>SKU（规格）管理</Divider>
        {skus.map((s, idx) => (
          <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
            <Input
              placeholder="规格，如 颜色:黑色,尺码:39"
              defaultValue={specPlain(idx)}
              onBlur={(e) => onSkuChange(idx, 'spec_values', parseSpec(e.target.value))}
              style={{ width: 260 }}
            />
            <InputNumber placeholder="价格" min={0} value={s.price} onChange={(v) => onSkuChange(idx, 'price', v)} />
            <InputNumber placeholder="库存" min={0} value={s.stock} onChange={(v) => onSkuChange(idx, 'stock', v)} />
            <Button type="text" danger onClick={() => setSkus((prev) => prev.filter((_, i) => i !== idx))}>删</Button>
          </div>
        ))}
        <Button onClick={() => setSkus((prev) => [...prev, { sku_code: '', spec_values: {}, price: 0, stock: 0 }])}>+ 添加SKU</Button>
      </Modal>
    </Card>
  )
}

function parseSpec(text: string): Record<string, string> {
  const obj: Record<string, string> = {}
  text.split(/[，,]/).forEach((pair) => {
    const idx = pair.indexOf(':')
    if (idx > 0) obj[pair.slice(0, idx).trim()] = pair.slice(idx + 1).trim()
  })
  return obj
}