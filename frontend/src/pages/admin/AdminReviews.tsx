import React, { useEffect, useState } from 'react'
import { Card, Table, Tag, Button, Rate, Popconfirm, Input, message } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { adminApi } from '../../api'
import { dataOf } from '../../api/client'

export default function AdminReviews() {
  const [list, setList] = useState<any[]>([])
  const [keyword, setKeyword] = useState<string>()

  const load = () => adminApi.reviews().then((r) => setList(dataOf(r)))
  useEffect(() => { load() }, [])

  const remove = async (id: number) => {
    await adminApi.reviewDelete(id)
    message.success('评价已删除')
    load()
  }

  const filtered = keyword ? list.filter((r) => (r.product_name || '').includes(keyword) || (r.content || '').includes(keyword)) : list

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '商品', dataIndex: 'product_name' },
    { title: '用户', dataIndex: 'nickname' },
    { title: '评分', dataIndex: 'rating', render: (v: number) => <Rate disabled value={v} style={{ fontSize: 14 }} /> },
    { title: '内容', dataIndex: 'content' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === 'ACTIVE' ? 'green' : 'red'}>{v === 'ACTIVE' ? '正常' : '已删除'}</Tag> },
    {
      title: '操作', render: (_: any, r: any) => r.status === 'ACTIVE' ? (
        <Popconfirm title="确认删除该评价？" onConfirm={() => remove(r.id)}>
          <Button size="small" danger>删除</Button>
        </Popconfirm>
      ) : <span className="text-muted">-</span>,
    },
  ]

  return (
    <Card title="评价管理">
      <div style={{ marginBottom: 16 }}>
        <Input placeholder="搜索商品/内容" prefix={<SearchOutlined />} style={{ width: 220 }} onChange={(e) => setKeyword(e.target.value)} />
      </div>
      <Table rowKey="id" columns={columns} dataSource={filtered} pagination={false} />
    </Card>
  )
}