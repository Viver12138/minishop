import React, { useEffect, useState } from 'react'
import { Card, List, Tag, Empty, Descriptions } from 'antd'
import { refundApi } from '../../api'
import { dataOf } from '../../api/client'
import type { Refund } from '../../types'

const color: Record<string, string> = { PENDING: 'orange', APPROVED: 'blue', REJECTED: 'red', REFUNDED: 'green' }

export default function MyRefunds() {
  const [list, setList] = useState<Refund[]>([])
  useEffect(() => {
    refundApi.my().then((r) => setList(dataOf(r)))
  }, [])

  return (
    <Card title="售后记录">
      {list.length === 0 ? <Empty description="暂无售后记录" /> : (
        <List
          dataSource={list}
          renderItem={(r) => (
            <List.Item>
              <Card size="small" style={{ width: '100%' }}>
                <Descriptions column={2} size="small" items={[
                  { key: 'no', label: '订单号', children: r.order_no },
                  { key: 's', label: '状态', children: <Tag color={color[r.status]}>{r.status_cn}</Tag> },
                  { key: 'a', label: '退款金额', children: <span className="money">￥{r.amount}</span> },
                  { key: 'r', label: '原因', children: r.reason },
                  { key: 'd', label: '说明', children: r.description || '-' },
                  { key: 'rr', label: '拒绝原因', children: r.reject_reason || '-' },
                ]} />
              </Card>
            </List.Item>
          )}
        />
      )}
    </Card>
  )
}