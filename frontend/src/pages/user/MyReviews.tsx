import React, { useEffect, useState } from 'react'
import { Card, List, Rate, Empty } from 'antd'
import { reviewApi } from '../../api'
import { dataOf } from '../../api/client'

export default function MyReviews() {
  const [list, setList] = useState<any[]>([])
  useEffect(() => {
    reviewApi.my().then((r) => setList(dataOf(r)))
  }, [])

  return (
    <Card title="我的评价">
      {list.length === 0 ? <Empty description="暂无评价" /> : (
        <List
          dataSource={list}
          renderItem={(r) => (
            <List.Item>
              <List.Item.Meta
                title={<span>{r.product_name} <Rate disabled value={r.rating} style={{ fontSize: 14 }} /></span>}
                description={<div><div>{r.content}</div><div className="text-muted" style={{ fontSize: 12 }}>{r.created_at}</div></div>}
              />
            </List.Item>
          )}
        />
      )}
    </Card>
  )
}