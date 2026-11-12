import React, { useEffect, useState } from 'react'
import { Card, Table, Tag, Button, Space, Modal, Form, Input, InputNumber, message } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { adminApi } from '../../api'
import { dataOf } from '../../api/client'

export default function AdminCoupons() {
  const [list, setList] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form] = Form.useForm()

  const load = () => adminApi.coupons().then((r) => setList(dataOf(r)))
  useEffect(() => { load() }, [])

  const submit = async () => {
    const v = await form.validateFields()
    const payload = {
      name: v.name, type: 'FULL_REDUCTION', threshold: v.threshold, discount_amount: v.discount_amount,
      total_quantity: v.total_quantity || 0, status: v.status || 'ACTIVE',
      end_time: v.end_time ? new Date(v.end_time).toISOString() : null,
    }
    if (editing) await adminApi.couponUpdate(editing.id, payload)
    else await adminApi.couponCreate(payload)
    message.success('保存成功')
    setOpen(false)
    load()
  }

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '名称', dataIndex: 'name' },
    { title: '门槛', dataIndex: 'threshold', render: (v: number) => `满${v}` },
    { title: '优惠', dataIndex: 'discount_amount', render: (v: number) => <span className="money">减{v}</span> },
    { title: '已用/总量', render: (_: any, r: any) => `${r.used_quantity}/${r.total_quantity || '∞'}` },
    { title: '状态', dataIndex: 'status', render: (v: string) => v === 'ACTIVE' ? <Tag color="green">启用</Tag> : <Tag>停用</Tag> },
    {
      title: '操作', render: (_: any, r: any) => (
        <Button size="small" onClick={() => { setEditing(r); form.setFieldsValue({ ...r, end_time: r.end_time, status: r.status }); setOpen(true) }}>编辑</Button>
      ),
    },
  ]

  return (
    <Card title="优惠券管理" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setOpen(true) }}>创建优惠券</Button>}>
      <Table rowKey="id" columns={columns} dataSource={list} pagination={false} />
      <Modal title={editing ? '编辑优惠券' : '创建优惠券'} open={open} onCancel={() => setOpen(false)} onOk={submit}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="优惠券名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Space>
            <Form.Item name="threshold" label="使用门槛" rules={[{ required: true }]}><InputNumber min={0} /></Form.Item>
            <Form.Item name="discount_amount" label="优惠金额" rules={[{ required: true }]}><InputNumber min={0} /></Form.Item>
          </Space>
          <Space>
            <Form.Item name="total_quantity" label="总数量"><InputNumber min={0} placeholder="0=不限" /></Form.Item>
            <Form.Item name="end_time" label="截止时间"><Input type="datetime-local" /></Form.Item>
          </Space>
          <Form.Item name="status" label="状态">
            {/* 使用 antd Select 代替 Switch，因为 form 初始化方便 */}
            <NativeSelect />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}

import { Select } from 'antd'
function NativeSelect() {
  return <Select style={{ width: '100%' }} options={[{ value: 'ACTIVE', label: '启用' }, { value: 'DISABLED', label: '停用' }]} placeholder="选择状态" />
}