import React, { useEffect, useState } from 'react'
import { Card, List, Tag, Button, Empty, Badge } from 'antd'
import { messageApi } from '../../api'
import { dataOf } from '../../api/client'

export default function Messages() {
  const [list, setList] = useState<any[]>([])
  const load = () => messageApi.list().then((r) => setList(dataOf(r)))
  useEffect(() => { load() }, [])

  const markAll = async () => {
    await messageApi.markAllRead()
    load()
  }

  const markOne = async (id: number) => {
    await messageApi.markRead(id)
    load()
  }

  return (
    <Card title="站内消息" extra={<Button onClick={markAll} disabled={!list.some((m) => !m.is_read)}>全部已读</Button>}>
      {list.length === 0 ? <Empty description="暂无消息" /> : (
        <List
          dataSource={list}
          renderItem={(m) => (
            <List.Item onClick={() => !m.is_read && markOne(m.id)} style={{ cursor: 'pointer' }}>
              <List.Item.Meta
                avatar={<Badge dot={!m.is_read}><div style={{ fontSize: 24 }}>🔔</div></Badge>}
                title={<span>{m.title} <Tag color={!m.is_read ? 'blue' : 'default'}>{!m.is_read ? '未读' : '已读'}</Tag></span>}
                description={<div><div>{m.content}</div><div className="text-muted" style={{ fontSize: 12 }}>{m.created_at}</div></div>}
              />
            </List.Item>
          )}
        />
      )}
    </Card>
  )
}