import React, { useEffect, useState } from 'react'
import { Card, List, Button, Tag, Tabs, message, Empty } from 'antd'
import { couponApi } from '../../api'
import { dataOf } from '../../api/client'

export default function MyCoupons() {
  const [my, setMy] = useState<any[]>([])
  const [available, setAvailable] = useState<any[]>([])
  const [tab, setTab] = useState('MY')

  const load = () => {
    couponApi.my().then((r) => setMy(dataOf(r)))
    couponApi.available().then((r) => setAvailable(dataOf(r)))
  }
  useEffect(() => { load() }, [])

  const claim = async (id: number) => {
    await couponApi.claim(id)
    message.success('领取成功')
    load()
  }

  const couponCard = (c: any, action?: React.ReactNode) => (
    <Card size="small" style={{ marginBottom: 12, borderLeft: '3px solid #1677ff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 700 }}>{c.name}</div>
          <div className="money" style={{ fontSize: 20 }}>满{c.threshold}减{c.discount_amount}</div>
          <div className="text-muted" style={{ fontSize: 12 }}>有效期至：{c.end_time || '长期有效'}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <Tag color={c.status_cn === '可用' ? 'blue' : 'default'}>{c.status_cn}</Tag>
          {action}
        </div>
      </div>
    </Card>
  )

  return (
    <Card title="我的优惠券">
      <Tabs
        activeKey={tab}
        onChange={setTab}
        items={[
          { key: 'MY', label: '我的券', children: my.length === 0 ? <Empty /> : my.map((c) => couponCard(c)) },
          { key: 'AVAILABLE', label: '领券中心', children: available.length === 0 ? <Empty /> : available.map((c) => couponCard(c, c.claimed ? <Tag>已领取</Tag> : <Button size="small" type="primary" onClick={() => claim(c.id)}>领取</Button>)) },
        ]}
      />
    </Card>
  )
}