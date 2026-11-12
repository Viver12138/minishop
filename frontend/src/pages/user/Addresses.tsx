import React, { useEffect, useState } from 'react'
import { Card, Button, List, Modal, Form, Input, Switch, Popconfirm, message, Space } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { addressApi } from '../../api'
import { dataOf } from '../../api/client'
import type { Address } from '../../types'

export default function Addresses() {
  const [list, setList] = useState<Address[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Address | null>(null)
  const [form] = Form.useForm()

  const load = () => addressApi.list().then((r) => setList(dataOf(r)))
  useEffect(() => { load() }, [])

  const openEdit = (a?: Address) => {
    setEditing(a || null)
    if (a) form.setFieldsValue(a)
    else form.resetFields()
    setOpen(true)
  }

  const submit = async () => {
    const v = await form.validateFields()
    if (editing) {
      await addressApi.update(editing.id, v)
      message.success('地址已更新')
    } else {
      await addressApi.create(v)
      message.success('地址已添加')
    }
    setOpen(false)
    load()
  }

  const remove = async (id: number) => {
    await addressApi.remove(id)
    message.success('已删除')
    load()
  }

  const setDefault = async (id: number) => {
    await addressApi.setDefault(id)
    message.success('已设为默认')
    load()
  }

  return (
    <Card title="收货地址">
      <Button type="primary" icon={<PlusOutlined />} onClick={() => openEdit()} style={{ marginBottom: 16 }}>新增地址</Button>
      <List
        grid={{ gutter: 16, column: 2 }}
        dataSource={list}
        renderItem={(a) => (
          <List.Item>
            <Card size="small">
              <div style={{ fontWeight: 600 }}>
                {a.receiver_name} <span className="text-muted" style={{ fontWeight: 400 }}>{a.phone}</span>
              </div>
              <div>{a.full_address}</div>
              {a.is_default && <span className="text-muted" style={{ color: '#1677ff' }}>✓ 默认地址</span>}
              <div style={{ marginTop: 8 }}>
                <Space>
                  <Button size="small" onClick={() => openEdit(a)}>编辑</Button>
                  {!a.is_default && <Button size="small" onClick={() => setDefault(a.id)}>设为默认</Button>}
                  <Popconfirm title="确认删除？" onConfirm={() => remove(a.id)}>
                    <Button size="small" danger>删除</Button>
                  </Popconfirm>
                </Space>
              </div>
            </Card>
          </List.Item>
        )}
      />

      <Modal title={editing ? '编辑地址' : '新增地址'} open={open} onCancel={() => setOpen(false)} onOk={submit}>
        <Form form={form} layout="vertical">
          <Form.Item name="receiver_name" label="收货人" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="phone" label="手机号" rules={[{ required: true }]}><Input /></Form.Item>
          <Space>
            <Form.Item name="province" label="省份"><Input /></Form.Item>
            <Form.Item name="city" label="城市"><Input /></Form.Item>
            <Form.Item name="district" label="区县"><Input /></Form.Item>
          </Space>
          <Form.Item name="detail_address" label="详细地址"><Input /></Form.Item>
          <Form.Item name="is_default" label="设为默认地址" valuePropName="checked"><Switch /></Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}