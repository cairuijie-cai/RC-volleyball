# GO-M8010-6 关节电机 STM32 HAL 通讯例程

[GoM_ComDemo_STM32_HAL.zip](https://oss-global-cdn.unitree.com/static/7af2438fd70548879b80a0068ef159b3.zip)

基于 STM32F103C8T6 的 GO-M8010-6 关节电机通讯协议 Demo。如果要移植到其他型号的 MCU，推荐使用带有 FPU 的 MCU。

## 硬件要求

1. **MCU UART/USART 外设**需要支持 4Mbps 的波特率。
2. [TTL转RS485模块](https://detail.tmall.com/item.htm?abbucket=1&id=679335252560&ns=1&priceTId=2150498617387404313944373e18df&skuId=4943221225710&spm=a21n57.1.hoverItem.2&utparam=%7B%22aplus_abtest%22%3A%2260c89d595e7695d55f804a72cf790a35%22%7D&xxc=taobaoSearch)（RS485 收发器）需要支持 4Mbps 的波特率（Unitree 旗舰店有售）。

## TTL 转 RS485 模块的连线

| [TTL 转 485 模块] | [MCU]  |
|-------------------|--------|
| RX                | PA10   |
| TX                | PA9    |
| RE/DE             | PA11   |
| 5V                | 5V     |
| GND               | GND    |

![](https://doc-cdn.unitree.com/static/2025/2/5/5b370fd65d2d48c1bcc9b835d9f1f33a_2908x2051.png)


## RS485 线序定义

[RS485 线序定义](https://support.unitree.com/home/zh/Motor_SDK_Dev_Guide/4-channel_485_to_USB_module)

推荐使用 GH1.25-3P 连接器，可以搭配 Unitree 电机附件包使用。为了保证可靠的通讯质量，RS485 总线的 GND 与 MCU 的 GND 必须连接到一起。

## 注意事项

- 请勿将 RS485 的 A 或 B 连通高压，例如 A 与 DC24v 连通。这会造成总线上的所有非隔离的 RS485 设备烧毁，并且这不在保修范围内。

## 调试流程
![](https://doc-cdn.unitree.com/static/2025/2/5/f7266109c1d149ac843f12bf0bc78e47_3024x1634.jpg)
将``TTL转485模块``引出的``RS485信号线``与电机连接。
将SWD接口与调试器连接，开发板供电。
![](https://doc-cdn.unitree.com/static/2025/2/5/46b5c55807994f6f9edb684bc8af0297_1035x491.jpg)
下载例程程序后，进入Debug模式调试。
![](https://doc-cdn.unitree.com/static/2025/2/5/62b1088a6a08445a8122aaa3e93d2ff9_625x444.jpg)
添加`Watch 1`窗口
![](https://doc-cdn.unitree.com/static/2025/2/5/a729f7101f1a46e2a9bbdc31d9c8ff61_507x223.jpg)
添加 `cmd` 和 `data`变量
![](https://doc-cdn.unitree.com/static/2025/2/5/c03927fd38e3461f8028d58e13f1c3a7_987x274.jpg)
点击Run按钮 开始执行程序
![](https://doc-cdn.unitree.com/static/2025/2/5/9c9123007f7842a9b9eca0ed072bb370_505x334.jpg)
此时查看`Watch 1`窗口，展开`data`变量，可以看到数据开始更新，`timeout`应为0，这是正常的。
![](https://doc-cdn.unitree.com/static/2025/2/5/0f56b95a6bc4427c8a727c9acafd909c_482x338.jpg)
如果没有与电机成功建立连接，则`timeout`会一直增加
![](https://doc-cdn.unitree.com/static/2025/2/5/4ba863241c15410bba9b20df809a6b68_481x272.jpg)
查看`Watch 1`窗口，展开`cmd`变量，将`mode`设置为5，电机会开始缓慢开环转动
此时 T/W/Pos/K_P/K_W 参数不会响应
`mode`设置为0，电机停止转动
![](https://doc-cdn.unitree.com/static/2025/2/5/ab6225ae0373402f8401320434624a40_485x276.jpg)
将`mode`设置为1，T/W/Pos/K_P/K_W均设置为0，电机进入零力矩模式，用手转动输出端会发现阻力很小，类似于电机没有上电时的状态。

T/W/Pos/K_P/K_W的参数设置请参考：[https://support.unitree.com/home/zh/Motor_SDK_Dev_Guide/overview](https://support.unitree.com/home/zh/Motor_SDK_Dev_Guide/overview)

> 请注意，使用该例程控制电机所有的参数均为转子侧（而不是输出端侧）

STM32的例程与C++版本的例程，参数命名并不相同，请您留意：
| col | [stm32] | [C++] |
| - | - | - |
| 前馈力矩 | T | Tau |
| 期望角度位置 | Pos | Q_des |
| 期望角速度 | W | dq_des |
| 期望刚度  | K_P | Kp |
| 期望阻尼  | K_W | Kd |