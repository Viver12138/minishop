import React, { useEffect, useState } from 'react'
import { Card, List, Button, message, Empty } from 'antd'
import { HeartOutlined } from '@ant-design/icons'
import { favoriteApi } from '../../api'
import { dataOf } from '../../api/client'
import type { Product } from '../../types'
import { Link } from 'react-router-dom'

export default function Favorites() {
  const [list, setList] = useState<Product[]>([])
  const load = () => favoriteApi.list().then((r) => setList(dataOf(r)))
  useEffect(() => { load() }, [])

  const remove = async (id: number) => {
    await favoriteApi.remove(id)
    message.success('已取消收藏')
    load()
  }

  return (
    <Card title="我的收藏">
      {list.length === 0 ? <Empty description="暂无收藏" /> : (
        <List
          grid={{ gutter: 16, column: 4 }}
          dataSource={list}
          renderItem={(p) => (
            <List.Item>
              <Link to={`/products/${p.id}`}>
                <Card hoverable cover={<img src={p.images[0]} style={{ height: 150, objectFit: 'cover' }} />}>
                  <Card.Meta title={p.name} description={<span className="money">￥{Number(p.price).toFixed(2)}</span>} />
                </Card>
              </Link>
              <Button icon={<HeartOutlined />} danger type="text" onClick={() => remove(p.id)} style={{ position: 'absolute', right: 8, top: 8 }} />
            </List.Item>
          )}
        />
      )}
    </Card>
  )
}