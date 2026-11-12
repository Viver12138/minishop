import React, { useEffect, useState } from 'react'
import { Card, Table, Tag, InputNumber, Button, Modal, message, Space } from 'antd'
import { adminApi } from '../../api'
import { dataOf } from '../../api/client'

export default function AdminInventory() {
  const [list, setList] = useState<any[]>([])
  const [adjust, setAdjust] = useState<any>(null)
  const [change, setChange] = useState(0)
  const [reason, setReason] = useState('')

  const load = () => adminApi.inventory().then((r) => setList(dataOf(r)))
  useEffect(() => { load() }, [])

  const submitAdjust = async () => {
    if (change === 0) { message.warning('调整数量不能为0'); return }
    await adminApi.inventoryAdjust({ sku_id: adjust.sku_id, change_quantity: change, reason: reason || '人工调整' })
    message.success('库存已调整')
    setAdjust(null)
    setChange(0)
    setReason('')
    load()
  }

  const columns = [
    { title: '商品', dataIndex: 'product_name' },
    { title: '规格', dataIndex: 'spec_values', render: (v: any) => Object.entries(v || {}).map(([k, val]) => `${k}:${val}`).join(' | ') || '默认' },
    { title: '当前库存', dataIndex: 'stock', render: (v: number, r: any) => <Tag color={v <= 0 ? 'red' : v <= 5 ? 'orange' : 'green'}>{v}</Tag> },
    { title: '状态', dataIndex: 'status' },
    {
      title: '操作', render: (_: any, r: any) => <Button size="small" type="primary" onClick={() => setAdjust(r)}>调整库存</Button>,
    },
  ]

  return (
    <Card title="库存管理">
      <Table rowKey="sku_id" columns={columns} dataSource={list} pagination={false} />
      <Modal title={`调整库存 - ${adjust?.product_name || ''}`} open={!!adjust} onCancel={() => setAdjust(null)} onOk={submitAdjust}>
        {adjust && (
          <div>
            <div style={{ marginBottom: 12 }}>当前库存：<Tag color="blue">{adjust.stock}</Tag>（输入正数增加，负数减少）</div>
            <Space>
              <InputNumber value={change} onChange={(v) => setChange(v || 0)} placeholder="调整数量" />
              <InputNumber disabled value={adjust.stock + change} placeholder="调整后" />
            </Space>
            <div style={{ marginTop: 12 }}><CertificatePlaceholder text="调整后库存需≥0" /></div>
          </div>
        )}
      </Modal>
    </Card>
  )
}

function CertificatePlaceholder({ text }: { text: string }) {
  return <span style={{ color: '#999', fontSize: 12 }}>{text}</span>
}