import React, { useEffect, useState } from 'react'
import { Card, Table, Button, Space, Modal, Form, Input, Switch, Tag, message, Popconfirm } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { adminApi } from '../../api'
import { dataOf } from '../../api/client'
import type { Category } from '../../types'

export default function AdminCategories() {
  const [list, setList] = useState<Category[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [form] = Form.useForm()

  const load = () => adminApi.categories().then((r) => setList(dataOf(r)))
  useEffect(() => { load() }, [])

  const submit = async () => {
    const v = await form.validateFields()
    if (editing) await adminApi.categoryUpdate(editing.id, v)
    else await adminApi.categoryCreate(v)
    message.success('保存成功')
    setOpen(false)
    load()
  }

  const toggle = async (c: Category) => {
    await adminApi.categoryUpdate(c.id, { status: c.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE' })
    load()
  }

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '名称', dataIndex: 'name' },
    { title: '状态', dataIndex: 'status', render: (v: string) => v === 'ACTIVE' ? <Tag color="green">启用</Tag> : <Tag>停用</Tag> },
    {
      title: '操作', render: (_: any, r: Category) => (
        <Space>
          <Button size="small" onClick={() => { setEditing(r); form.setFieldsValue(r); setOpen(true) }}>编辑</Button>
          <Button size="small" onClick={() => toggle(r)}>{r.status === 'ACTIVE' ? '停用' : '启用'}</Button>
        </Space>
      ),
    },
  ]

  return (
    <Card title="分类管理" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setOpen(true) }}>新增分类</Button>}>
      <Table rowKey="id" columns={columns} dataSource={list} pagination={false} />
      <Modal title={editing ? '编辑分类' : '新增分类'} open={open} onCancel={() => setOpen(false)} onOk={submit}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="分类名称" rules={[{ required: true }]}><Input /></Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}