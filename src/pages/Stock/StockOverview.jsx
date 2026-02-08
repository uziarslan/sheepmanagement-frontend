import React from 'react';
import { Link } from 'react-router-dom';
import { HiOutlineCube, HiOutlinePlus } from 'react-icons/hi';
import { PageHeader, Card, Button } from '../../components/common';

const StockOverview = () => {
  const cards = [
    {
      title: 'Medication Stock',
      description: 'Manage medicines and injections',
      path: '/dashboard/stock/medication'
    },
    {
      title: 'Feeding Stock',
      description: 'Manage feed and supplements',
      path: '/dashboard/stock/feeding'
    },
    {
      title: 'Farm Accessories',
      description: 'Manage accessories and supplies',
      path: '/dashboard/stock/farm-accessories'
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Management"
        subtitle="Choose a category to manage stock"
        breadcrumbs={[{ label: 'Stock' }]}
        action={
          <Link to="/dashboard/stock/medication/add">
            <Button icon={HiOutlinePlus}>Add Medication</Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((card) => (
          <Link to={card.path} key={card.title}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <HiOutlineCube className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{card.title}</p>
                  <p className="text-sm text-gray-500">{card.description}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default StockOverview;
