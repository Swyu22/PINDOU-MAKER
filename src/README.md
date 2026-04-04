# src

## 作用
- 项目源码主目录，承载拼豆图纸生成器 V1 的前端实现与测试基线。

## 边界
- 现已锁定为 Vite + React + TypeScript 的前端单体实现；业务逻辑继续按模块边界拆分。

## 目录清单
- `main.tsx`：React 应用入口
- `App.tsx`：移动优先的拼豆图纸生成器页面壳
- `App.test.tsx`：应用壳与关键控件回归测试
- `styles.css`：全局视觉样式与响应式布局
- `vite-env.d.ts`：Vite 类型声明
- `test/setup.ts`：测试运行时初始化
- `modules/README.md`：业务模块职责与文件清单
- `modules/palette/mard221.ts`：Mard 221 固定色库
- `modules/pattern/types.ts`：图纸、像素和配置类型
- `modules/pattern/generator.ts`：图片缩放、量化和平滑
- `modules/pattern/preview.ts`：移动端预览缩放与格内色号规则
- `modules/pattern/history.ts`：编辑器撤销/重做
- `modules/export/sheet.ts`：图纸布局与 PNG 导出
- `shared/README.md`：共享层说明
- `assets/`：静态资源与设计素材
