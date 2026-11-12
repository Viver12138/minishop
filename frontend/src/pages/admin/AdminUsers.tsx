import React, { useEffect, useState } from 'react'
import { Card, Table, Tag, Input, Button, Space, Modal, Descriptions, Popconfirm, message } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { adminApi } from '../../api'
import { dataOf } from '../../api/client'

export default function AdminUsers() {
  const [list, setList] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState<string>()
  const [detail, setDetail] = useState<any>(null)

  const load = () => {
    adminApi.users({ page, page_size: 10, keyword }).then((r) => {
      const d = dataOf(r)
      setList(d.items)
      setTotal(d.total)
    })
  }
  useEffect(load, [page, keyword])

  const viewDetail = async (id: number) => {
    const r = await adminApi.userDetail(id)
    const orders = await adminApi.userOrders(id)
    setDetail({ user: dataOf(r), orders: dataOf(orders) })
  }

  const toggleStatus = async (u: any) => {
    const newStatus = u.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE'
    await adminApi.userStatus(u.id, newStatus)
    message.success(newStatus === 'DISABLED' ? '已禁用' : '已恢复')
    load()
  }

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '用户名', dataIndex: 'username' },
    { title: '昵称', dataIndex: 'nickname' },
    { title: '角色', dataIndex: 'role', render: (v: string) => v === 'ADMIN' ? <Tag color="gold">管理员</Tag> : <Tag color="blue">用户</Tag> },
    { title: '手机', dataIndex: 'phone' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === 'ACTIVE' ? 'green' : 'red'}>{v === 'ACTIVE' ? '正常' : '禁用'}</Tag> },
    {
      title: '操作', render: (_: any, r: any) => (
        <Space>
          <Button size="small" onClick={() => viewDetail(r.id)}>详情/订单</Button>
          {r.role !== 'ADMIN' && (
            <Popconfirm title={r.status === 'ACTIVE' ? '确认禁用该账号？' : '确认恢复该账号？'} onConfirm={() => toggleStatus(r)}>
              <Button size="small" danger={r.status === 'ACTIVE'}>{r.status === 'ACTIVE' ? '禁用' : '恢复'}</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  return (
    <Card title="用户管理">
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Input placeholder="搜索用户名/昵称" prefix={<SearchOutlined />} onChange={(e) => setKeyword(e.target.value || undefined)} onPressEnter={() => { setPage(1); load() }} style={{ width: 220 }} />
          <Button type="primary" onClick={() => { setPage(1); load() }}>查询</Button>
        </Space>
      </div>
      <Table rowKey="id" columns={columns} dataSource={list} pagination={{ current: page, total, pageSize: 10, onChange: setPage }} />

      <Modal title={`用户详情 - ${detail?.user.username || ''}`} open={!!detail} onCancel={() => setDetail(null)} footer={null} width={700}>
        {detail && (
          <div>
            <Descriptions column={2} size="small" items={[
              { key: 'n', label: '昵称', children: detail.user.nickname },
              { key: 'p', label: '手机', children: detail.user.phone || '-' },
              { key: 'e', label: '邮箱', children: detail.user.email || '-' },
              { key: 'r', label: '角色', children: detail.user.role },
              { key: 'oc', label: '订单数', children: detail.user.order_count },
              { key: 'cr', label: '注册时间', children: detail.user.created_at },
            ]} />
            <DividerPlaceholder />
            <Table rowKey="id" size="small" pagination={false} dataSource={detail.orders} columns={[
              { title: '订单号', dataIndex: 'order_no' },
              { title: '实付', dataIndex: 'pay_amount' },
              { title: '状态', dataIndex: 'status_cn' },
            ]} />
          </div>
        )}
      </Modal>
    </Card>
  )
}

function DividerPlaceholder() {
  return <div style={{ height: 1, background: '#f0f0f0', margin: '12px 0' }} />
}