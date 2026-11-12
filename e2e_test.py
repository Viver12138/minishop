import requests, json
B = "http://127.0.0.1:8000/api"
ok = 0; fail = 0
def check(name, cond, extra=""):
    global ok, fail
    if cond:
        ok += 1; print(f"  [PASS] {name}")
    else:
        fail += 1; print(f"  [FAIL] {name} :: {extra}")

print("===== 认证 =====")
r = requests.post(B+"/auth/login", json={"username":"admin","password":"admin123"})
check("管理员登录", r.status_code==200 and r.json()["data"]["user"]["role"]=="ADMIN", r.text[:200])
ADMIN = r.json()["data"]["token"]
r = requests.post(B+"/auth/login", json={"username":"user","password":"123456"})
check("用户登录", r.status_code==200, r.text[:200])
USER = r.json()["data"]["token"]
r = requests.post(B+"/auth/login", json={"username":"user","password":"wrong"})
check("错误密码->401", r.status_code==401, r.text[:200])
r = requests.get(B+"/admin/dashboard", headers={"Authorization":"Bearer "+USER})
check("用户访问管理API->403", r.status_code==403, r.text[:200])
r = requests.get(B+"/admin/dashboard", headers={"Authorization":"Bearer "+ADMIN})
check("管理员访问dashboard", r.status_code==200, r.text[:200])
r = requests.get(B+"/cart")
check("无token访问cart->401", r.status_code==401, r.text[:200])

def H(t): return {"Authorization":"Bearer "+t}

print("===== 商品 =====")
r = requests.get(B+"/products")
check("商品列表", r.status_code==200 and r.json()["data"]["total"]>=9, r.text[:200])
r = requests.get(B+"/products?keyword=手机")
check("搜索手机", r.status_code==200 and r.json()["data"]["total"]>=1, str(r.json()["data"]["total"]))
r = requests.get(B+"/products?min_price=100&max_price=500&sort=price_asc")
check("价格区间+排序", r.status_code==200, r.text[:200])
r = requests.get(B+"/products/6")
check("无线鼠标(库存0)详情", r.status_code==200 and r.json()["data"]["stock"]==0 if r.status_code==200 else False, r.text[:200])
r = requests.get(B+"/products/8")
shoe = r.json()["data"]
check("运动鞋多规格SKU=8", r.status_code==200 and len(shoe["skus"])==8, "skus="+str(len(shoe["skus"])))

print("===== 购物车 =====")
sku1 = shoe["skus"][0]["id"]
r = requests.post(B+"/cart/items", json={"sku_id":sku1,"quantity":1}, headers=H(USER))
check("加购运动鞋", r.status_code==201, r.text[:200])
requests.post(B+"/cart/items", json={"sku_id":sku1,"quantity":1}, headers=H(USER))
r = requests.get(B+"/cart", headers=H(USER))
cart = r.json()["data"]["items"]
check("同SKU合并数量=2", r.status_code==200 and any(i["sku_id"]==sku1 and i["quantity"]==2 for i in cart), str(cart))
cart_id = next(i["id"] for i in cart if i["sku_id"]==sku1)
# 数量不能超过库存(鞋sku库存2)
r = requests.put(B+"/cart/items/"+str(cart_id), json={"quantity":5}, headers=H(USER))
check("数量超过库存->拒绝", r.status_code in (400,409), r.text[:200])
r = requests.put(B+"/cart/items/"+str(cart_id), json={"quantity":2}, headers=H(USER))
check("改数量到2", r.status_code==200, r.text[:200])
# 加购咖啡并修改数量到5
coffee0 = requests.get(B+"/products?keyword=咖啡", headers=H(USER)).json()["data"]["items"][0]
coffee_sku0 = coffee0["skus"][0]["id"]
requests.post(B+"/cart/items", json={"sku_id":coffee_sku0,"quantity":1}, headers=H(USER))
r = requests.get(B+"/cart", headers=H(USER))
coff_cart = next(i for i in r.json()["data"]["items"] if i["sku_id"]==coffee_sku0)
r = requests.put(B+"/cart/items/"+str(coff_cart["id"]), json={"quantity":5}, headers=H(USER))
check("咖啡改数量到5", r.status_code==200, r.text[:200])

print("===== 地址 =====")
r = requests.post(B+"/addresses", json={"receiver_name":"张三","phone":"13800138000","province":"广东省","city":"深圳市","district":"南山区","detail_address":"科技园路1号","is_default":True}, headers=H(USER))
check("创建地址", r.status_code==201, r.text[:200])
addr_id = r.json()["data"]["id"]
r = requests.post(B+"/addresses", json={"receiver_name":"李四","phone":"13900139000","province":"北京市","city":"北京市","district":"海淀区","detail_address":"中关村大街2号","is_default":True}, headers=H(USER))
check("创建第二个地址并设为默认", r.status_code==201, r.text[:200])
addr2 = r.json()["data"]["id"]
r = requests.get(B+"/addresses", headers=H(USER))
addrs = r.json()["data"]
defaults = [a for a in addrs if a["is_default"]]
check("只有一个默认地址", len(defaults)==1, str(addrs))

print("===== 优惠券 =====")
r = requests.get(B+"/coupons/available", headers=H(USER))
avail = r.json()["data"]
check("可领优惠券>=3", len(avail)>=3, str(len(avail)))
newbie = next(c for c in avail if c["name"]=="新人满100减10")
r = requests.post(B+"/coupons/"+str(newbie["id"])+"/claim", headers=H(USER))
check("领取新人券", r.status_code==201, r.text[:200])
r = requests.post(B+"/coupons/"+str(newbie["id"])+"/claim", headers=H(USER))
check("重复领取->409", r.status_code==409, r.text[:200])
myc = requests.get(B+"/coupons/my", headers=H(USER)).json()["data"]
uc_id = next(c for c in myc if c["coupon_id"]==newbie["id"])["id"]
print("   用户券:", [c["name"]+":"+c["status_cn"] for c in myc])

print("===== 订单预览 =====")
coffee = requests.get(B+"/products?keyword=咖啡", headers=H(USER)).json()["data"]["items"][0]
coffee_sku = coffee["skus"][0]["id"] if coffee["skus"] else None
mech = requests.get(B+"/products?keyword=机械键盘", headers=H(USER)).json()["data"]["items"][0]
mech_sku = mech["skus"][0]["id"] if mech["skus"] else None
r = requests.post(B+"/orders/preview", json={"items":[{"sku_id":mech_sku,"quantity":3}],"address_id":addr_id,"user_coupon_id":uc_id}, headers=H(USER))
check("订单预览1197用券", r.status_code==200, r.text[:300])
pv = r.json()["data"]
check("预览金额=1197-新人券10", pv["pay_amount"]==1187, str(pv))

print("===== 创建订单 =====")
r = requests.post(B+"/orders", json={"items":[{"sku_id":mech_sku,"quantity":3}],"address_id":addr_id,"user_coupon_id":uc_id,"payment_method":"WECHAT"}, headers=H(USER))
check("创建订单", r.status_code==201, r.text[:300])
order = r.json()["data"]
order_id = order["id"]
check("订单状态=待支付", order["status"]=="PENDING_PAYMENT", order["status"])
check("订单金额=1187", order["pay_amount"]==1187, str(order["pay_amount"]))

print("===== 支付 =====")
r = requests.post(B+"/payments", json={"order_id":order_id,"method":"WECHAT"}, headers=H(USER))
check("创建支付", r.status_code==201, r.text[:200])
pay_id = r.json()["data"]["id"]
r = requests.post(B+"/payments/"+str(pay_id)+"/success", headers=H(USER))
check("支付成功", r.status_code==200, r.text[:200])
r = requests.post(B+"/payments/"+str(pay_id)+"/success", headers=H(USER))
check("重复支付->409", r.status_code==409, r.text[:200])
r = requests.get(B+"/orders/"+str(order_id), headers=H(USER))
check("订单状态->已支付", r.json()["data"]["status"]=="PAID", r.json()["data"]["status"])

print("===== 库存扣减 =====")
r = requests.get(B+"/products/"+str(mech["id"]), headers=H(USER))
check("机械键盘库存50->47", r.json()["data"]["stock"]==47, str(r.json()["data"]["stock"]))

print("===== 管理员发货 =====")
r = requests.post(B+"/admin/orders/"+str(order_id)+"/ship", json={"company":"顺丰","tracking_number":"SF123456789"}, headers=H(ADMIN))
check("发货", r.status_code==200, r.text[:300])
r = requests.get(B+"/orders/"+str(order_id), headers=H(USER))
check("订单状态->已发货", r.json()["data"]["status"]=="SHIPPED")
check("有物流信息", r.json()["data"].get("shipment") is not None, str(r.json()["data"].get("shipment")))

print("===== 确认收货+评价 =====")
r = requests.post(B+"/orders/"+str(order_id)+"/confirm", headers=H(USER))
check("确认收货", r.status_code==200, r.text[:200])
r = requests.get(B+"/orders/"+str(order_id), headers=H(USER))
check("订单状态->已完成", r.json()["data"]["status"]=="COMPLETED")
item = r.json()["data"]["items"][0]
r = requests.post(B+"/reviews", json={"order_item_id":item["id"],"rating":5,"content":"很好用"}, headers=H(USER))
check("发表评价", r.status_code==201, r.text[:300])
r = requests.get(B+"/products/"+str(mech["id"])+"/reviews")
check("商品详情显示评价", r.status_code==200 and r.json()["data"]["total"]>=1)

print("===== 库存边界测试 =====")
bt = requests.get(B+"/products?keyword=蓝牙耳机", headers=H(USER)).json()["data"]["items"][0]
bt_sku = bt["skus"][0]["id"]
r = requests.post(B+"/cart/items", json={"sku_id":bt_sku,"quantity":2}, headers=H(USER))
check("库存1买2->拒绝", r.status_code in (400,409), r.text[:200])
mouse = requests.get(B+"/products?keyword=无线鼠标", headers=H(USER)).json()["data"]["items"][0]
mouse_sku = mouse["skus"][0]["id"]
r = requests.post(B+"/cart/items", json={"sku_id":mouse_sku,"quantity":1}, headers=H(USER))
check("库存0购买->拒绝", r.status_code in (400,409), r.text[:200])

print("===== 退款流程 =====")
xiaomi = requests.get(B+"/products?keyword=小米手机", headers=H(USER)).json()["data"]["items"][0]
xiaomi_sku = xiaomi["skus"][0]["id"]
r = requests.post(B+"/orders", json={"items":[{"sku_id":xiaomi_sku,"quantity":1}],"address_id":addr2}, headers=H(USER))
refund_order = r.json()["data"]
ro_id = refund_order["id"]
r = requests.post(B+"/payments", json={"order_id":ro_id}, headers=H(USER))
refund_pay = r.json()["data"]["id"]
requests.post(B+"/payments/"+str(refund_pay)+"/success", headers=H(USER))
r = requests.post(B+"/refunds", json={"order_id":ro_id,"reason":"不想要了","description":"测试退款"}, headers=H(USER))
check("申请退款", r.status_code==201, r.text[:300])
refund_id = r.json()["data"]["id"]
r = requests.get(B+"/orders/"+str(ro_id), headers=H(USER))
check("订单状态->退款中", r.json()["data"]["status"]=="REFUNDING")
r = requests.post(B+"/admin/refunds/"+str(refund_id)+"/reject", json={"reject_reason":""}, headers=H(ADMIN))
check("拒绝无原因->400", r.status_code==400, r.text[:200])
r = requests.post(B+"/admin/refunds/"+str(refund_id)+"/approve", headers=H(ADMIN))
check("同意退款", r.status_code==200, r.text[:200])
r = requests.get(B+"/orders/"+str(ro_id), headers=H(USER))
check("订单状态->已退款", r.json()["data"]["status"]=="REFUNDED", r.json()["data"]["status"])
r = requests.get(B+"/products/"+str(xiaomi["id"]), headers=H(USER))
check("退款恢复库存", r.json()["data"]["stock"]==10, str(r.json()["data"]["stock"]))

print("===== 越权测试 =====")
rr = requests.post(B+"/auth/register", json={"username":"testerX","password":"123456"})
t2 = requests.post(B+"/auth/login", json={"username":"testerX","password":"123456"}).json()["data"]["token"]
r = requests.get(B+"/orders/"+str(order_id), headers=H(t2))
check("用户B看用户A订单->403", r.status_code==403, r.text[:200])

print("\n===== 结果: %d 通过, %d 失败 =====" % (ok, fail))