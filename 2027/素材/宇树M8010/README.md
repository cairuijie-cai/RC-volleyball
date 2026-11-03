# 宇树 GO-M8010-6 官方资料

下载核对日期：2026-11-03。型号：GO-M8010-6。原文件取自宇树官方文档中心、官方对象存储和官方GitHub仓库；未改写模型或手册。

## 常用文件

| 文件 | 内容 |
|---|---|
| [GO-M8010-6电机3D模型.stp](GO-M8010-6电机3D模型.stp) | STEP模型 |
| [GO-M8010-6电机使用手册_20240515.pdf](GO-M8010-6电机使用手册_20240515.pdf) | 中文手册 |
| [GO-M8010-6_Motor_User_Manual_20240515.pdf](GO-M8010-6_Motor_User_Manual_20240515.pdf) | 英文手册 |
| [GO-M8010-6官方尺寸图.jpg](GO-M8010-6官方尺寸图.jpg) | 尺寸图 |
| [GO-M8010-6官方接口引脚图.jpg](GO-M8010-6官方接口引脚图.jpg) | 接口图 |
| [GO-M8010-6官方转矩转速曲线.png](GO-M8010-6官方转矩转速曲线.png) | 转子侧曲线 |
| [控制开发/unitree_actuator_sdk_5b79a42d81cd.zip](控制开发/unitree_actuator_sdk_5b79a42d81cd.zip) | 官方C++/Python SDK源代码快照 |
| [控制开发/GoM_ComDemo_STM32_HAL.zip](控制开发/GoM_ComDemo_STM32_HAL.zip) | STM32 HAL通讯例程 |
| [控制开发/4路USB转485多电机例程.zip](控制开发/4路USB转485多电机例程.zip) | 多电机通讯例程 |
| [官方文档/关于M8010_官方原文.md](官方文档/关于M8010_官方原文.md) | 官方文档原文 |
| [官方文档/资料下载_官方原文.md](官方文档/资料下载_官方原文.md) | 官方文档原文 |
| [官方文档/串口协议_官方原文.md](官方文档/串口协议_官方原文.md) | 官方协议原文 |
| [官方文档/获取SDK_官方原文.md](官方文档/获取SDK_官方原文.md) | SDK获取说明原文 |
| [官方文档/STM32例程_官方原文.md](官方文档/STM32例程_官方原文.md) | STM32例程说明原文 |

## 官方来源

- [官方资料下载页](https://support.unitree.com/home/zh/Motor_SDK_Dev_Guide/Download)
- [官方型号、尺寸、接口及控制概述](https://support.unitree.com/home/zh/Motor_SDK_Dev_Guide/about)
- [宇树产品页](https://www.unitree.com/cn/go1/motor/)
- [官方电机SDK](https://github.com/unitreerobotics/unitree_actuator_sdk)
- [官方Windows电机调试助手](https://github.com/unitreerobotics/unitree-motor-debugging-assistant)

SDK快照固定到提交 `5b79a42d81cd69adac1367db79efdb972a898fd1`，ZIP保留原仓库许可证及目录；通讯例程仅下载核验压缩包，未连接电机或运行。固件、驱动及更新工具见官方资料下载页。

## 机械使用

STEP为官方简化模型，供结构设计及装配参考；尺寸图为官方原图。可用SolidWorks导入STEP，安装尺寸和接口以本型号手册、原图及实物核对。原始图片与下载文件的大小、SHA-256及来源均记录在`下载清单.json`中。

## 控制学习入口

先阅读中文使用手册和官方串口协议，再参考SDK中的GO-M8010-6例程或STM32 HAL通讯例程。参数按转子侧还是输出侧定义，应依官方文档对应章节处理；本目录未将不同侧的参数混为一谈。

官方Markdown快照保留原文及外链；其中相对链接如未在本目录下载，请通过上面的官方文档中心访问对应页面。所有官方资料版权及许可证保持原归属。
