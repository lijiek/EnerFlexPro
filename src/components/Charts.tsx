import React from 'react';
import dynamic from 'next/dynamic';
import type { LineConfig, ColumnConfig, PieConfig } from '@ant-design/plots';

// 禁用服务端渲染的图表组件
export const Line: React.FC<LineConfig> = dynamic(
  () => import('@ant-design/plots').then((mod) => mod.Line),
  { ssr: false }
) as React.FC<LineConfig>;

export const Column: React.FC<ColumnConfig> = dynamic(
  () => import('@ant-design/plots').then((mod) => mod.Column),
  { ssr: false }
) as React.FC<ColumnConfig>;

export const Pie: React.FC<PieConfig> = dynamic(
  () => import('@ant-design/plots').then((mod) => mod.Pie),
  { ssr: false }
) as React.FC<PieConfig>; 