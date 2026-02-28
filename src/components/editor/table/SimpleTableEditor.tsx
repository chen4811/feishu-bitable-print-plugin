import React from 'react';

interface SimpleTableEditorProps {
  content: any;
  onChange: (content: any) => void;
}

export const SimpleTableEditor: React.FC<SimpleTableEditorProps> = ({ content, onChange }) => {
  // 简单的表格数据
  const [tableData, setTableData] = React.useState<string[][]>([
    ['单元格1', '单元格2', '单元格3'],
    ['单元格4', '单元格5', '单元格6'],
    ['单元格7', '单元格8', '单元格9'],
  ]);

  const handleCellChange = (row: number, col: number, value: string) => {
    const newData = [...tableData];
    newData[row] = [...newData[row]];
    newData[row][col] = value;
    setTableData(newData);
    onChange({ type: 'simple-table', data: newData });
  };

  const addRow = () => {
    const newRow = new Array(tableData[0]?.length || 3).fill('');
    setTableData([...tableData, newRow]);
    onChange({ type: 'simple-table', data: [...tableData, newRow] });
  };

  const addColumn = () => {
    const newData = tableData.map(row => [...row, '']);
    setTableData(newData);
    onChange({ type: 'simple-table', data: newData });
  };

  return (
    <div className="simple-table-editor" style={{ border: '1px solid #ddd', padding: '8px' }}>
      {/* 工具栏 */}
      <div className="toolbar" style={{ marginBottom: '8px' }}>
        <button onClick={addRow} style={{ marginRight: '8px', padding: '4px 8px' }}>添加行</button>
        <button onClick={addColumn} style={{ marginRight: '8px', padding: '4px 8px' }}>添加列</button>
      </div>
      
      {/* 表格区域 */}
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <tbody>
          {tableData.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, colIndex) => (
                <td 
                  key={colIndex} 
                  style={{ 
                    border: '1px solid #ddd', 
                    padding: '8px',
                    backgroundColor: 'white',
                  }}
                >
                  <input
                    type="text"
                    value={cell}
                    onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                    style={{ 
                      width: '100%', 
                      border: 'none', 
                      background: 'transparent',
                      outline: 'none',
                    }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
