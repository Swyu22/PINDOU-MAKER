# src/modules

## 作用
- 存放业务模块，按拼豆图纸生成器的核心能力拆分。

## 边界
- 可依赖 `src/shared/`，不得反向依赖 UI 页面或文档目录。

## 文件清单
- `palette/mard221.ts`：Mard 221 固定色库
- `palette/mard221.test.ts`：色库总量与格式校验
- `pattern/types.ts`：图纸与配置类型
- `pattern/generator.ts`：图片缩放、量化与平滑
- `pattern/generator.test.ts`：量化和平滑回归测试
- `pattern/preview.ts`：移动端预览缩放与格内色号规则
- `pattern/preview.test.ts`：移动端预览尺寸回归测试
- `pattern/history.ts`：撤销/重做状态
- `pattern/history.test.ts`：历史状态回归测试
- `export/sheet.ts`：图纸布局与 PNG 导出
- `export/sheetLayout.test.ts`：图纸模型与图例回归测试
