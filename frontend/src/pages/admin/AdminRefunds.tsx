import React, { useEffect, useState } from 'react'
import { Card, Table, Tag, Button, Select, Space, Modal, Input, message, Descriptions } from 'antd'
import { adminApi } from '../../api'
import { dataOf } from '../../api/client'

const color: Record<string, string> = { PENDING: 'orange', APPROVED: 'blue', REJECTED: 'red', REFUNDED: 'green' }

export default function AdminRefunds() {
  const [list, setList] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<string>()
  const [rejectOpen, setRejectOpen] = useState<number | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const load = () => {
    adminApi.refunds({ page, page_size: 10, status }).then((r) => {
      const d = dataOf(r)
      setList(d.items)
      setTotal(d.total)
    })
  }
  useEffect(load, [page, status])

  const approve = async (id: number) => {
    await adminApi.refundApprove(id)
    message.success('已同意退款')
    load()
  }

  const reject = async () => {
    if (!rejectReason.trim()) { message.warning('拒绝时必须填写原因'); return }
    await adminApi.refundReject(rejectOpen!, rejectReason)
    message.success('已拒绝退款')
    setRejectOpen(null)
    setRejectReason('')
    load()
  }

  const columns = [
    { title: '订单号', dataIndex: 'order_no' },
    { title: '用户', dataIndex: 'username' },
    { title: '商品', dataIndex: 'product_names' },
    { title: '退款金额', dataIndex: 'amount', render: (v: number) => <span className="money">￥{v}</span> },
    { title: '原因', dataIndex: 'reason' },
    { title: '申请时间', dataIndex: 'created_at' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={color[v]}>{statusCn(v)}</Tag> },
    {
      title: '操作', render: (_: any, r: any) => r.status === 'PENDING' ? (
        <Space>
          <Button type="primary" size="small" onClick={() => approve(r.id)}>同意</Button>
          <Button danger size="small" onClick={() => setRejectOpen(r.id)}>拒绝</Button>
        </Space>
      ) : <span className="text-muted">{r.reject_reason || '-'}</span>,
    },
  ]

  return (
    <Card title="售后管理">
      <div style={{ marginBottom: 16 }}>
        <Select placeholder="按状态筛选" allowClear style={{ width: 160 }} value={status} onChange={(v) => { setStatus(v); setPage(1) }}
          options={['PENDING', 'APPROVED', 'REJECTED', 'REFUNDED'].map((s) => ({ value: s, label: statusCn(s) }))} />
      </div>
      <Table rowKey="id" columns={columns} dataSource={list} pagination={{ current: page, total, pageSize: 10, onChange: setPage }} />

      <Modal title="拒绝退款" open={!!rejectOpen} onCancel={() => setRejectOpen(null)} onOk={reject}>
        <div style={{ marginBottom: 12, color: '#999' }}>拒绝时必须填写原因</div>
        <Input.TextArea rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="请填写拒绝原因" />
      </Modal>
    </Card>
  )
}

function statusCn(s: string) {
  return { PENDING: '待审核', APPROVED: '已同意', REJECTED: '已拒绝', REFUNDED: '已退款' }[s] || s
}