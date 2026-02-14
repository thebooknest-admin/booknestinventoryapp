'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { colors, typography, spacing, radii, shadows } from '@/styles/tokens';
import { getInventory, updateBookCopy } from '@/app/actions/inventory';
import { getQueueStats } from '@/app/actions/getQueueStats';

interface InventoryItem {
  id: string;
  sku: string;
  isbn: string;
  title: string;
  author: string;
  ageGroup: string;
  bin: string;
  status: string;
  receivedAt: string;
  coverUrl: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  in_house: 'In House',
  picking: 'Picking',
  picked: 'Picked',
  packed: 'Packed',
  shipped: 'Shipped',
  returned: 'Returned',
  damaged: 'Damaged',
  retired: 'Retired',
};

const STATUS_COLORS: Record<string, string> = {
  in_house: colors.sageMist,
  picking: colors.goldenHoney,
  picked: colors.primary,
  packed: colors.deepTeal,
  shipped: colors.secondary,
  returned: colors.peachClay,
  damaged: colors.warning,
  retired: colors.textLight,
};

const AGE_GROUP_LABELS: Record<string, string> = {
  hatchlings: 'Hatchlings (0-2)',
  fledglings: 'Fledglings (3-5)',
  soarers: 'Soarers (6-8)',
  sky_readers: 'Sky Readers (9-12)',
};

export default function Dashboard() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [filteredInventory, setFilteredInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Edit modal state
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    isbn: '',
    title: '',
    author: '',
    ageGroup: '',
    bin: '',
    status: '',
    coverUrl: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Enlarged cover state
  const [enlargedCover, setEnlargedCover] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [ageGroupFilter, setAgeGroupFilter] = useState<string>('all');

  // Sorting
  const [sortBy, setSortBy] = useState<'sku' | 'title' | 'bin' | 'received'>('received');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Stats
  const [stats, setStats] = useState({
    pickingQueue: 0,
    shippingQueue: 0,
    completedToday: 0,
  });

  // Load inventory
  useEffect(() => {
    loadInventoryAndStats();
  }, []);

  async function loadInventoryAndStats() {
  setIsLoading(true);

  try {
    // Fetch inventory and stats in parallel
    const [inventoryResult, statsResult] = await Promise.all([
      getInventory(),
      getQueueStats()
    ]);

    if (inventoryResult.success && inventoryResult.inventory) {
      const activeInventory = inventoryResult.inventory.filter((item) => item.status !== 'retired');
      setInventory(activeInventory);
      setFilteredInventory(activeInventory);
    }

    if (statsResult.success && statsResult.stats) {
      setStats(statsResult.stats);
    }
  } catch (err) {
    console.error('Failed to load inventory:', err);
  } finally {
    setIsLoading(false);
  }
}

  // Apply filters and sorting
  useEffect(() => {
    // Start with inventory, excluding retired books
    let filtered = inventory.filter((item) => item.status !== 'retired');

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.sku?.toLowerCase().includes(query) ||
          item.title?.toLowerCase().includes(query) ||
          item.author?.toLowerCase().includes(query) ||
          item.isbn?.toLowerCase().includes(query) ||
          item.bin?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((item) => item.status === statusFilter);
    }

    // Age group filter
    if (ageGroupFilter !== 'all') {
      filtered = filtered.filter((item) => item.ageGroup === ageGroupFilter);
    }

    // Sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'sku':
          comparison = (a.sku || '').localeCompare(b.sku || '');
          break;
        case 'title':
          comparison = (a.title || '').localeCompare(b.title || '');
          break;
        case 'bin':
          comparison = (a.bin || '').localeCompare(b.bin || '');
          break;
        case 'received':
          comparison = new Date(a.receivedAt || 0).getTime() - new Date(b.receivedAt || 0).getTime();
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredInventory(filtered);
  }, [inventory, searchQuery, statusFilter, ageGroupFilter, sortBy, sortOrder]);

  const handleSort = (column: 'sku' | 'title' | 'bin' | 'received') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setAgeGroupFilter('all');
  };

  const handleRowClick = (item: InventoryItem) => {
    setSelectedItem(item);
    setEditForm({
      isbn: item.isbn || '',
      title: item.title || '',
      author: item.author || '',
      ageGroup: item.ageGroup || '',
      bin: item.bin || '',
      status: item.status || '',
      coverUrl: item.coverUrl || '',
    });
    setIsEditing(true);
    setSaveError(null);
  };

  const handleCloseModal = () => {
    setIsEditing(false);
    setSelectedItem(null);
    setSaveError(null);
  };

  const handleSave = async () => {
    if (!selectedItem) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      const result = await updateBookCopy(selectedItem.id, editForm);

      if (result.success) {
        await loadInventoryAndStats();
        handleCloseModal();
      } else {
        setSaveError(result.error || 'Failed to update book copy');
      }
    } catch (err) {
      setSaveError('An unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: spacing.xl,
        maxWidth: '1600px',
        margin: '0 auto',
      }}
    >
      <header
        style={{
          marginBottom: spacing.xl,
          paddingBottom: spacing.lg,
          borderBottom: `3px solid ${colors.primary}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: typography.fontFamily.heading,
              fontSize: typography.fontSize['4xl'],
              fontWeight: typography.fontWeight.bold,
              color: colors.primary,
              margin: 0,
              marginBottom: spacing.xs,
            }}
          >
            Book Nest Ops
          </h1>
          <p
            style={{
              fontSize: typography.fontSize.lg,
              color: colors.textLight,
              margin: 0,
            }}
          >
            Logistics Dashboard
          </p>
        </div>
        
        {/* Pippa Mascot */}
        <div
          style={{
            width: '120px',
            height: '120px',
            borderRadius: radii.full,
            overflow: 'hidden',
            border: `3px solid ${colors.primary}`,
            backgroundColor: colors.cream,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: shadows.md,
          }}
        >
          <img
            src="/pippa.png"
            alt="Pippa the Book Nest mascot"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </div>
      </header>

      {/* Stats Overview */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: spacing.lg,
          marginBottom: spacing['2xl'],
        }}
      >
        <div
          style={{
            backgroundColor: colors.surface,
            border: `3px solid ${colors.deepTeal}`,
            borderRadius: radii.md,
            padding: spacing.lg,
          }}
        >
          <div
            style={{
              fontSize: typography.fontSize['3xl'],
              fontWeight: typography.fontWeight.bold,
              color: colors.deepTeal,
              marginBottom: spacing.xs,
            }}
          >
            {stats.pickingQueue}
          </div>
          <div
            style={{
              fontSize: typography.fontSize.sm,
              color: colors.textLight,
              textTransform: 'uppercase',
              fontWeight: typography.fontWeight.semibold,
              letterSpacing: '0.05em',
            }}
          >
            Picking Queue
          </div>
        </div>

        <div
          style={{
            backgroundColor: colors.surface,
            border: `3px solid ${colors.mustardOchre}`,
            borderRadius: radii.md,
            padding: spacing.lg,
          }}
        >
          <div
            style={{
              fontSize: typography.fontSize['3xl'],
              fontWeight: typography.fontWeight.bold,
              color: colors.mustardOchre,
              marginBottom: spacing.xs,
            }}
          >
            {stats.shippingQueue}
          </div>
          <div
            style={{
              fontSize: typography.fontSize.sm,
              color: colors.textLight,
              textTransform: 'uppercase',
              fontWeight: typography.fontWeight.semibold,
              letterSpacing: '0.05em',
            }}
          >
            Shipping Queue
          </div>
        </div>

        <div
          style={{
            backgroundColor: colors.surface,
            border: `3px solid ${colors.sageMist}`,
            borderRadius: radii.md,
            padding: spacing.lg,
          }}
        >
          <div
            style={{
              fontSize: typography.fontSize['3xl'],
              fontWeight: typography.fontWeight.bold,
              color: colors.sageMist,
              marginBottom: spacing.xs,
            }}
          >
            {stats.completedToday}
          </div>
          <div
            style={{
              fontSize: typography.fontSize.sm,
              color: colors.textLight,
              textTransform: 'uppercase',
              fontWeight: typography.fontWeight.semibold,
              letterSpacing: '0.05em',
            }}
          >
            Completed Today
          </div>
        </div>

        <div
          style={{
            backgroundColor: colors.surface,
            border: `3px solid ${colors.lightCocoa}`,
            borderRadius: radii.md,
            padding: spacing.lg,
          }}
        >
          <div
            style={{
              fontSize: typography.fontSize['3xl'],
              fontWeight: typography.fontWeight.bold,
              color: colors.lightCocoa,
              marginBottom: spacing.xs,
            }}
          >
            {filteredInventory.length}
          </div>
          <div
            style={{
              fontSize: typography.fontSize.sm,
              color: colors.textLight,
              textTransform: 'uppercase',
              fontWeight: typography.fontWeight.semibold,
              letterSpacing: '0.05em',
            }}
          >
            Total Inventory
          </div>
        </div>
      </div>

      {/* Primary Actions */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: spacing.lg,
          marginBottom: spacing['2xl'],
        }}
      >
        <Link
          href="/receive"
          style={{
            display: 'block',
            backgroundColor: colors.peachClay,
            color: colors.deepCocoa,
            padding: spacing.xl,
            borderRadius: radii.md,
            textDecoration: 'none',
            border: `3px solid ${colors.peachClay}`,
          }}
        >
          <div
            style={{
              fontSize: typography.fontSize['2xl'],
              fontWeight: typography.fontWeight.bold,
              marginBottom: spacing.sm,
            }}
          >
            RECEIVE BOOKS
          </div>
          <div
            style={{
              fontSize: typography.fontSize.base,
              opacity: 0.9,
            }}
          >
            Scan ISBN and add to inventory →
          </div>
        </Link>

        <Link
          href="/work/picking"
          style={{
            display: 'block',
            backgroundColor: colors.primary,
            color: colors.cream,
            padding: spacing.xl,
            borderRadius: radii.md,
            textDecoration: 'none',
            border: `3px solid ${colors.primary}`,
          }}
        >
          <div
            style={{
              fontSize: typography.fontSize['2xl'],
              fontWeight: typography.fontWeight.bold,
              marginBottom: spacing.sm,
            }}
          >
            START PICKING
          </div>
          <div
            style={{
              fontSize: typography.fontSize.base,
              opacity: 0.9,
            }}
          >
            View picking queue →
          </div>
        </Link>

        <Link
          href="/work/shipping"
          style={{
            display: 'block',
            backgroundColor: colors.secondary,
            color: colors.cream,
            padding: spacing.xl,
            borderRadius: radii.md,
            textDecoration: 'none',
            border: `3px solid ${colors.secondary}`,
          }}
        >
          <div
            style={{
              fontSize: typography.fontSize['2xl'],
              fontWeight: typography.fontWeight.bold,
              marginBottom: spacing.sm,
            }}
          >
            START SHIPPING
          </div>
          <div
            style={{
              fontSize: typography.fontSize.base,
              opacity: 0.9,
            }}
          >
            View shipping queue →
          </div>
        </Link>

        <Link
          href="/returns"
          style={{
            display: 'block',
            backgroundColor: colors.softBlush,
            color: colors.deepCocoa,
            padding: spacing.xl,
            borderRadius: radii.md,
            textDecoration: 'none',
            border: `3px solid ${colors.softBlush}`,
          }}
        >
          <div
            style={{
              fontSize: typography.fontSize['2xl'],
              fontWeight: typography.fontWeight.bold,
              marginBottom: spacing.sm,
            }}
          >
            PROCESS RETURNS
          </div>
          <div
            style={{
              fontSize: typography.fontSize.base,
              opacity: 0.9,
            }}
          >
            Scan SKU and update status →
          </div>
        </Link>
      </div>

      {/* Inventory Section */}
      <div
        style={{
          marginBottom: spacing.xl,
        }}
      >
        <h2
          style={{
            fontSize: typography.fontSize['2xl'],
            fontWeight: typography.fontWeight.bold,
            color: colors.text,
            margin: 0,
            marginBottom: spacing.lg,
          }}
        >
          Inventory ({filteredInventory.length} items)
        </h2>

        <div
          style={{
            display: 'flex',
            gap: spacing.md,
            alignItems: 'center',
            marginBottom: spacing.md,
            flexWrap: 'wrap',
          }}
        >
          <Link
            href="/work/labels"
            style={{
              display: 'inline-block',
              padding: `${spacing.xs} ${spacing.md}`,
              borderRadius: radii.sm,
              border: `2px solid ${colors.border}`,
              backgroundColor: colors.surface,
              color: colors.text,
              textDecoration: 'none',
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.semibold,
            }}
          >
            🏷️ Open Label Queue
          </Link>

          <Link
            href="/work/valuation"
            style={{
              display: 'inline-block',
              padding: `${spacing.xs} ${spacing.md}`,
              borderRadius: radii.sm,
              border: `2px solid ${colors.border}`,
              backgroundColor: colors.surface,
              color: colors.text,
              textDecoration: 'none',
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.semibold,
            }}
          >
            💎 Open Value Intelligence
          </Link>
        </div>

        {/* Filters */}
        <div
          style={{
            backgroundColor: colors.surface,
            border: `3px solid ${colors.border}`,
            borderRadius: radii.md,
            padding: spacing.lg,
            marginBottom: spacing.lg,
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: spacing.md,
              marginBottom: spacing.md,
            }}
          >
            {/* Search */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: typography.fontSize.xs,
                  fontWeight: typography.fontWeight.bold,
                  color: colors.textLight,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: spacing.xs,
                }}
              >
                Search
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="SKU, title, author..."
                style={{
                  width: '100%',
                  padding: spacing.sm,
                  fontSize: typography.fontSize.sm,
                  color: colors.text,
                  backgroundColor: colors.cream,
                  border: `2px solid ${colors.border}`,
                  borderRadius: radii.sm,
                  fontFamily: typography.fontFamily.body,
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Status Filter */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: typography.fontSize.xs,
                  fontWeight: typography.fontWeight.bold,
                  color: colors.textLight,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: spacing.xs,
                }}
              >
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: spacing.sm,
                  fontSize: typography.fontSize.sm,
                  color: colors.text,
                  backgroundColor: colors.cream,
                  border: `2px solid ${colors.border}`,
                  borderRadius: radii.sm,
                  fontFamily: typography.fontFamily.body,
                  cursor: 'pointer',
                }}
              >
                <option value="all">All Statuses</option>
                <option value="in_house">In House</option>
                <option value="picking">Picking</option>
                <option value="picked">Picked</option>
                <option value="packed">Packed</option>
                <option value="shipped">Shipped</option>
                <option value="returned">Returned</option>
                <option value="damaged">Damaged</option>
                <option value="retired">Retired</option>
              </select>
            </div>

            {/* Age Group Filter */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: typography.fontSize.xs,
                  fontWeight: typography.fontWeight.bold,
                  color: colors.textLight,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: spacing.xs,
                }}
              >
                Age Group
              </label>
              <select
                value={ageGroupFilter}
                onChange={(e) => setAgeGroupFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: spacing.sm,
                  fontSize: typography.fontSize.sm,
                  color: colors.text,
                  backgroundColor: colors.cream,
                  border: `2px solid ${colors.border}`,
                  borderRadius: radii.sm,
                  fontFamily: typography.fontFamily.body,
                  cursor: 'pointer',
                }}
              >
                <option value="all">All Ages</option>
                <option value="hatchlings">Hatchlings (0-2)</option>
                <option value="fledglings">Fledglings (3-5)</option>
                <option value="soarers">Soarers (6-8)</option>
                <option value="sky_readers">Sky Readers (9-12)</option>
              </select>
            </div>
          </div>

          <button
            onClick={clearFilters}
            style={{
              padding: `${spacing.xs} ${spacing.md}`,
              backgroundColor: colors.surface,
              color: colors.textLight,
              border: `2px solid ${colors.border}`,
              fontSize: typography.fontSize.xs,
              fontWeight: typography.fontWeight.semibold,
              textTransform: 'uppercase',
              borderRadius: radii.sm,
              cursor: 'pointer',
            }}
          >
            Clear Filters
          </button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div
            style={{
              textAlign: 'center',
              padding: spacing['2xl'],
              fontSize: typography.fontSize.lg,
              color: colors.textLight,
            }}
          >
            Loading inventory...
          </div>
        )}

        {/* Inventory Table */}
        {!isLoading && filteredInventory.length > 0 && (
          <div
            style={{
              backgroundColor: colors.surface,
              border: `2px solid ${colors.border}`,
              borderRadius: radii.md,
              overflow: 'hidden',
            }}
          >
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  minWidth: '1000px',
                }}
              >
                <thead>
                  <tr
                    style={{
                      backgroundColor: colors.primary,
                      color: colors.cream,
                    }}
                  >
                    <th
                      onClick={() => handleSort('sku')}
                      style={{
                        padding: spacing.md,
                        textAlign: 'left',
                        fontSize: typography.fontSize.sm,
                        fontWeight: typography.fontWeight.bold,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        cursor: 'pointer',
                        userSelect: 'none',
                      }}
                    >
                      SKU {sortBy === 'sku' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th
                      style={{
                        padding: spacing.md,
                        textAlign: 'left',
                        fontSize: typography.fontSize.sm,
                        fontWeight: typography.fontWeight.bold,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      Cover
                    </th>
                    <th
                      style={{
                        padding: spacing.md,
                        textAlign: 'left',
                        fontSize: typography.fontSize.sm,
                        fontWeight: typography.fontWeight.bold,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      ISBN
                    </th>
                    <th
                      onClick={() => handleSort('title')}
                      style={{
                        padding: spacing.md,
                        textAlign: 'left',
                        fontSize: typography.fontSize.sm,
                        fontWeight: typography.fontWeight.bold,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        cursor: 'pointer',
                        userSelect: 'none',
                      }}
                    >
                      Title {sortBy === 'title' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th
                      style={{
                        padding: spacing.md,
                        textAlign: 'left',
                        fontSize: typography.fontSize.sm,
                        fontWeight: typography.fontWeight.bold,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      Author
                    </th>
                    <th
                      style={{
                        padding: spacing.md,
                        textAlign: 'left',
                        fontSize: typography.fontSize.sm,
                        fontWeight: typography.fontWeight.bold,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      Age
                    </th>
                    <th
                      onClick={() => handleSort('bin')}
                      style={{
                        padding: spacing.md,
                        textAlign: 'left',
                        fontSize: typography.fontSize.sm,
                        fontWeight: typography.fontWeight.bold,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        cursor: 'pointer',
                        userSelect: 'none',
                      }}
                    >
                      Bin {sortBy === 'bin' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th
                      style={{
                        padding: spacing.md,
                        textAlign: 'left',
                        fontSize: typography.fontSize.sm,
                        fontWeight: typography.fontWeight.bold,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Status
                    </th>
                    <th
                      onClick={() => handleSort('received')}
                      style={{
                        padding: spacing.md,
                        textAlign: 'left',
                        fontSize: typography.fontSize.sm,
                        fontWeight: typography.fontWeight.bold,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        cursor: 'pointer',
                        userSelect: 'none',
                      }}
                    >
                      Received {sortBy === 'received' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInventory.map((item, index) => (
                    <tr
                      key={item.id}
                      onClick={() => handleRowClick(item)}
                      style={{
                        borderBottom: `2px solid ${colors.border}`,
                        backgroundColor: index % 2 === 0 ? colors.surface : colors.cream,
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = colors.peachClay;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = index % 2 === 0 ? colors.surface : colors.cream;
                      }}
                    >
                      <td
                        style={{
                          padding: spacing.md,
                          fontSize: typography.fontSize.base,
                          fontWeight: typography.fontWeight.bold,
                          color: colors.text,
                          fontFamily: 'monospace',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item.sku || 'N/A'}
                      </td>
                      <td
                        style={{
                          padding: spacing.md,
                        }}
                      >
                        {item.coverUrl ? (
                          <img
                            src={item.coverUrl}
                            alt={item.title}
                            onClick={(e) => {
                              e.stopPropagation();
                              setEnlargedCover(item.coverUrl);
                            }}
                            style={{
                              width: '40px',
                              height: '60px',
                              objectFit: 'cover',
                              borderRadius: radii.sm,
                              border: `1px solid ${colors.border}`,
                              cursor: 'pointer',
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: '40px',
                              height: '60px',
                              backgroundColor: colors.border,
                              borderRadius: radii.sm,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: typography.fontSize.xs,
                              color: colors.textLight,
                            }}
                          >
                            📚
                          </div>
                        )}
                      </td>
                      <td
                        style={{
                          padding: spacing.md,
                          fontSize: typography.fontSize.sm,
                          color: colors.textLight,
                          fontFamily: 'monospace',
                        }}
                      >
                        {item.isbn || 'N/A'}
                      </td>
                      <td
                        style={{
                          padding: spacing.md,
                          fontSize: typography.fontSize.sm,
                          color: colors.text,
                        }}
                      >
                        {item.title || 'Untitled'}
                      </td>
                      <td
                        style={{
                          padding: spacing.md,
                          fontSize: typography.fontSize.sm,
                          color: colors.textLight,
                        }}
                      >
                        {item.author || 'Unknown'}
                      </td>
                      <td
                        style={{
                          padding: spacing.md,
                          fontSize: typography.fontSize.xs,
                          color: colors.text,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item.ageGroup ? (AGE_GROUP_LABELS[item.ageGroup] || item.ageGroup) : 'N/A'}
                      </td>
                      <td
                        style={{
                          padding: spacing.md,
                          fontSize: typography.fontSize.base,
                          fontWeight: typography.fontWeight.bold,
                          color: colors.primary,
                          fontFamily: 'monospace',
                        }}
                      >
                        {item.bin || 'N/A'}
                      </td>
                      <td style={{ padding: spacing.md }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: `${spacing.xs} ${spacing.sm}`,
                            backgroundColor: item.status ? (STATUS_COLORS[item.status] || colors.border) : colors.border,
                            color: colors.deepCocoa,
                            fontSize: typography.fontSize.xs,
                            fontWeight: typography.fontWeight.bold,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            borderRadius: radii.sm,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {item.status ? (STATUS_LABELS[item.status] || item.status) : 'Unknown'}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: spacing.md,
                          fontSize: typography.fontSize.xs,
                          color: colors.textLight,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item.receivedAt ? new Date(item.receivedAt).toLocaleDateString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredInventory.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: spacing['2xl'],
              backgroundColor: colors.surface,
              border: `2px solid ${colors.border}`,
              borderRadius: radii.md,
            }}
          >
            <p
              style={{
                fontSize: typography.fontSize.lg,
                color: colors.textLight,
                margin: 0,
              }}
            >
              {inventory.length === 0
                ? 'No inventory found. Start by receiving books!'
                : 'No items match your filters.'}
            </p>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {isEditing && selectedItem && (
        <>
          <div
            onClick={handleCloseModal}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 1000,
            }}
          />

          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: colors.surface,
              border: `3px solid ${colors.primary}`,
              borderRadius: radii.lg,
              padding: spacing.xl,
              maxWidth: '600px',
              width: '90%',
              maxHeight: '90vh',
              overflowY: 'auto',
              zIndex: 1001,
            }}
          >
            <h2
              style={{
                fontFamily: typography.fontFamily.heading,
                fontSize: typography.fontSize['2xl'],
                fontWeight: typography.fontWeight.bold,
                color: colors.primary,
                margin: 0,
                marginBottom: spacing.lg,
              }}
            >
              Edit Book Copy
            </h2>

            <div
              style={{
                marginBottom: spacing.lg,
                paddingBottom: spacing.lg,
                borderBottom: `2px solid ${colors.border}`,
              }}
            >
              <div style={{ marginBottom: spacing.sm }}>
                <span
                  style={{
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.bold,
                    color: colors.textLight,
                    textTransform: 'uppercase',
                  }}
                >
                  SKU:{' '}
                </span>
                <span
                  style={{
                    fontSize: typography.fontSize.lg,
                    fontWeight: typography.fontWeight.bold,
                    color: colors.text,
                    fontFamily: 'monospace',
                  }}
                >
                  {selectedItem.sku}
                </span>
              </div>
            </div>

            {saveError && (
              <div
                style={{
                  backgroundColor: colors.warning,
                  color: colors.deepCocoa,
                  padding: spacing.md,
                  borderRadius: radii.sm,
                  marginBottom: spacing.lg,
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.semibold,
                }}
              >
                {saveError}
              </div>
            )}

            <div style={{ marginBottom: spacing.xl }}>
              {/* ISBN */}
              <div style={{ marginBottom: spacing.lg }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.bold,
                    color: colors.textLight,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: spacing.sm,
                  }}
                >
                  ISBN
                </label>
                <input
                  type="text"
                  value={editForm.isbn}
                  onChange={(e) => setEditForm({ ...editForm, isbn: e.target.value })}
                  placeholder="ISBN or barcode"
                  style={{
                    width: '100%',
                    padding: spacing.md,
                    fontSize: typography.fontSize.base,
                    color: colors.text,
                    backgroundColor: colors.cream,
                    border: `2px solid ${colors.border}`,
                    borderRadius: radii.md,
                    fontFamily: 'monospace',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Title */}
              <div style={{ marginBottom: spacing.lg }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.bold,
                    color: colors.textLight,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: spacing.sm,
                  }}
                >
                  Title
                </label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  placeholder="Book title"
                  style={{
                    width: '100%',
                    padding: spacing.md,
                    fontSize: typography.fontSize.base,
                    color: colors.text,
                    backgroundColor: colors.cream,
                    border: `2px solid ${colors.border}`,
                    borderRadius: radii.md,
                    fontFamily: typography.fontFamily.body,
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Author */}
              <div style={{ marginBottom: spacing.lg }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.bold,
                    color: colors.textLight,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: spacing.sm,
                  }}
                >
                  Author
                </label>
                <input
                  type="text"
                  value={editForm.author}
                  onChange={(e) => setEditForm({ ...editForm, author: e.target.value })}
                  placeholder="Author name"
                  style={{
                    width: '100%',
                    padding: spacing.md,
                    fontSize: typography.fontSize.base,
                    color: colors.text,
                    backgroundColor: colors.cream,
                    border: `2px solid ${colors.border}`,
                    borderRadius: radii.md,
                    fontFamily: typography.fontFamily.body,
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Cover URL */}
              <div style={{ marginBottom: spacing.lg }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.bold,
                    color: colors.textLight,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: spacing.sm,
                  }}
                >
                  Cover Image URL
                </label>
                <input
                  type="text"
                  value={editForm.coverUrl}
                  onChange={(e) => setEditForm({ ...editForm, coverUrl: e.target.value })}
                  placeholder="https://example.com/cover.jpg"
                  style={{
                    width: '100%',
                    padding: spacing.md,
                    fontSize: typography.fontSize.sm,
                    color: colors.text,
                    backgroundColor: colors.cream,
                    border: `2px solid ${colors.border}`,
                    borderRadius: radii.md,
                    fontFamily: 'monospace',
                    boxSizing: 'border-box',
                  }}
                />
                {/* Cover Preview */}
                {editForm.coverUrl && (
                  <div style={{ marginTop: spacing.sm }}>
                    <img
                      src={editForm.coverUrl}
                      alt="Cover preview"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                      style={{
                        maxWidth: '150px',
                        maxHeight: '225px',
                        border: `2px solid ${colors.border}`,
                        borderRadius: radii.sm,
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Age Group */}
              <div style={{ marginBottom: spacing.lg }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.bold,
                    color: colors.textLight,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: spacing.sm,
                  }}
                >
                  Age Group
                </label>
                <select
                  value={editForm.ageGroup}
                  onChange={(e) => setEditForm({ ...editForm, ageGroup: e.target.value })}
                  style={{
                    width: '100%',
                    padding: spacing.md,
                    fontSize: typography.fontSize.base,
                    color: colors.text,
                    backgroundColor: colors.cream,
                    border: `2px solid ${colors.border}`,
                    borderRadius: radii.md,
                    fontFamily: typography.fontFamily.body,
                    cursor: 'pointer',
                  }}
                >
                  <option value="">Select age group...</option>
                  <option value="hatchlings">Hatchlings (0-2)</option>
                  <option value="fledglings">Fledglings (3-5)</option>
                  <option value="soarers">Soarers (6-8)</option>
                  <option value="sky_readers">Sky Readers (9-12)</option>
                </select>
              </div>

              {/* Bin */}
              <div style={{ marginBottom: spacing.lg }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.bold,
                    color: colors.textLight,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: spacing.sm,
                  }}
                >
                  Bin Location
                </label>
                <input
                  type="text"
                  value={editForm.bin}
                  onChange={(e) => setEditForm({ ...editForm, bin: e.target.value.toUpperCase() })}
                  placeholder="e.g., A-12-3"
                  style={{
                    width: '100%',
                    padding: spacing.md,
                    fontSize: typography.fontSize.lg,
                    fontWeight: typography.fontWeight.bold,
                    color: colors.text,
                    backgroundColor: colors.cream,
                    border: `2px solid ${colors.border}`,
                    borderRadius: radii.md,
                    fontFamily: 'monospace',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Status */}
              <div style={{ marginBottom: 0 }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.bold,
                    color: colors.textLight,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: spacing.sm,
                  }}
                >
                  Status
                </label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  style={{
                    width: '100%',
                    padding: spacing.md,
                    fontSize: typography.fontSize.base,
                    color: colors.text,
                    backgroundColor: colors.cream,
                    border: `2px solid ${colors.border}`,
                    borderRadius: radii.md,
                    fontFamily: typography.fontFamily.body,
                    cursor: 'pointer',
                  }}
                >
                  <option value="">Select status...</option>
                  <option value="in_house">In House</option>
                  <option value="picking">Picking</option>
                  <option value="picked">Picked</option>
                  <option value="packed">Packed</option>
                  <option value="shipped">Shipped</option>
                  <option value="returned">Returned</option>
                  <option value="damaged">Damaged</option>
                  <option value="retired">Retired</option>
                </select>
              </div>
            </div>

            {/* Modal Actions */}
            <div
              style={{
                display: 'flex',
                gap: spacing.md,
                justifyContent: 'flex-end',
              }}
            >
              <button
                onClick={handleCloseModal}
                disabled={isSaving}
                style={{
                  padding: `${spacing.md} ${spacing.lg}`,
                  backgroundColor: colors.surface,
                  color: colors.textLight,
                  border: `2px solid ${colors.border}`,
                  fontSize: typography.fontSize.base,
                  fontWeight: typography.fontWeight.semibold,
                  textTransform: 'uppercase',
                  borderRadius: radii.md,
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  opacity: isSaving ? 0.6 : 1,
                }}
              >
                Cancel
              </button>

              <button
                onClick={handleSave}
                disabled={isSaving}
                style={{
                  padding: `${spacing.md} ${spacing.xl}`,
                  backgroundColor: isSaving ? colors.border : colors.primary,
                  color: isSaving ? colors.textLight : colors.cream,
                  border: `2px solid ${isSaving ? colors.border : colors.primary}`,
                  fontSize: typography.fontSize.base,
                  fontWeight: typography.fontWeight.bold,
                  textTransform: 'uppercase',
                  borderRadius: radii.md,
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                }}
              >
                {isSaving ? 'SAVING...' : 'SAVE CHANGES'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Enlarged Cover Modal */}
      {enlargedCover && (
        <>
          <div
            onClick={() => setEnlargedCover(null)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              zIndex: 2000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <img
              src={enlargedCover}
              alt="Book cover"
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: '90%',
                maxHeight: '90vh',
                objectFit: 'contain',
                borderRadius: radii.lg,
                boxShadow: shadows.lg,
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}